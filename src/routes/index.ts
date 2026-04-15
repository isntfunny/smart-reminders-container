import { Router } from "express";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import YAML from "yaml";
import fs from "fs";
import { getHomeAssistantApiConfig, saveAutomationConfig } from "../homeAssistant";
import type { HomeAssistantClient } from "../homeAssistant";
import { EntityModel } from "../models/Entity";
import type { OpenRouterClient } from "../openRouter";
import { createOpenRouterClient } from "../openRouter";

type OpenRouterRef = { current: OpenRouterClient | null };

const OPTIONS_PATH = "/data/options.json";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type AutomationResponse = {
  title: string;
  message: string;
  yaml: string;
};

const AutomationResponseSchema = z.object({
  title: z.string(),
  message: z.string(),
  yaml: z.string()
});

function parseAutomationResponse(content: string): AutomationResponse | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const result = AutomationResponseSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  } catch {
    // fall through to extraction
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    // fall through to code block / yaml parsing
  } else {
    const jsonSlice = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonSlice);
      const result = AutomationResponseSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    } catch {
      // fall through to code block / yaml parsing
    }
  }

  const codeBlockMatch = trimmed.match(/```(?:json|yaml)?\s*([\s\S]*?)\s*```/i);
  const candidates = [codeBlockMatch?.[1], trimmed].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const result = AutomationResponseSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    } catch {
      // ignore
    }
    try {
      const parsed = YAML.parse(candidate);
      const result = AutomationResponseSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function createIndexRouter(hass: HomeAssistantClient, openRouterRef: OpenRouterRef): Router {
  const router = Router();

  async function getBaseViewData(entityQuery: string) {
    let status: unknown = null;
    let error: string | null = null;
    let entities: Array<{
      entityId: string;
      domain: string;
      state?: string | null;
      attributes?: Record<string, unknown>;
      lastSeen: Date;
    }> = [];

    try {
      status = await hass.status();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown Home Assistant error";
    }

    if (entityQuery) {
      const escaped = escapeRegex(entityQuery);
      const pattern = new RegExp(escaped, "i");
      entities = await EntityModel.find({
        $or: [{ entityId: pattern }, { domain: pattern }]
      })
        .sort({ lastSeen: -1 })
        .limit(25)
        .lean()
        .exec();
    }

    return {
      title: "Smart Reminders",
      status,
      error,
      entityQuery,
      entities,
      openRouterEnabled: false
    };
  }

  router.get("/", async (req, res) => {
    res.render("index", {
      title: "Smart Reminders"
    });
  });

  router.get("/entities", async (req, res) => {
    const entityQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const baseData = await getBaseViewData(entityQuery);
    res.render("entities", baseData);
  });

  router.post("/api/automation/generate", async (req, res) => {
    const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
    const baseYaml = typeof req.body.yaml === "string" ? req.body.yaml.trim() : "";
    const mode = typeof req.body.mode === "string" ? req.body.mode.trim() : "";

    if (!openRouterRef.current) {
      res.status(400).json({ ok: false, error: "OpenRouter ist nicht konfiguriert. Bitte OPENROUTER_API_KEY setzen." });
      return;
    }

    if (!prompt) {
      res.status(400).json({ ok: false, error: "Bitte eine Automation beschreiben." });
      return;
    }

    try {
      const entities = await EntityModel.find({}).sort({ lastSeen: -1 }).lean().exec();
      const systemPayload = JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          entities
        },
        null,
        2
      );

      const refinementNote =
        mode === "refine" && baseYaml
          ? [
              "Der Nutzer möchte eine bestehende Automation verfeinern.",
              "Hier ist die aktuelle Automation (YAML):",
              baseYaml
            ].join("\n")
          : null;

      const systemPrompt = [
        "Du bist ein Assistent für Home Assistant Automationen.",
        "Erstelle eine passende Automation basierend auf dem Nutzerwunsch und den Entitäten.",
        "Antworte ausschließlich mit einem JSON-Objekt im Format:",
        '{"title":"...","message":"...","yaml":"..."}',
        "Kein Markdown, keine Codeblöcke.",
        "Das Feld \"yaml\" ist ein String und nutzt \\n für Zeilenumbrüche.",
        "Nutze im YAML nur Entitäten aus den bereitgestellten Daten.",
        "Hier sind ALLE Entitäten aus der MongoDB im JSON-Format:",
        systemPayload,
        refinementNote
      ]
        .filter(Boolean)
        .join("\n");

      const or = openRouterRef.current!;
      const completion = await or.client.responses.parse({
        model: or.model,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        text: { format: zodTextFormat(AutomationResponseSchema, "automation") },
        max_output_tokens: or.maxTokens,
        temperature: or.temperature
      });

      const parsed = completion.output_parsed ?? parseAutomationResponse(completion.output_text ?? "");

      if (!parsed) {
        res.status(502).json({
          ok: false,
          error: "Antwort konnte nicht als JSON mit title/message/yaml geparst werden."
        });
        return;
      }

      const usage = completion.usage ?? null;
      res.json({ ok: true, ...parsed, usage });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      res.status(500).json({ ok: false, error: message });
    }
  });

  router.post("/api/automation/save", async (req, res) => {
    const yaml = typeof req.body.yaml === "string" ? req.body.yaml.trim() : "";
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";

    if (!yaml) {
      res.status(400).json({ ok: false, error: "Bitte YAML senden." });
      return;
    }

    const apiConfig = getHomeAssistantApiConfig();
    if (!apiConfig) {
      res.status(400).json({ ok: false, error: "HA_TOKEN fehlt. Bitte in der Umgebung setzen." });
      return;
    }

    let automationConfig: unknown;
    try {
      automationConfig = YAML.parse(yaml);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ungültiges YAML";
      res.status(400).json({ ok: false, error: message });
      return;
    }

    if (!automationConfig || typeof automationConfig !== "object" || Array.isArray(automationConfig)) {
      res.status(400).json({ ok: false, error: "YAML muss eine einzelne Automation (Objekt) enthalten." });
      return;
    }

    const configWithAlias = automationConfig as Record<string, unknown>;
    if (!configWithAlias.alias && title) {
      configWithAlias.alias = title;
    }

    try {
      const payload = await saveAutomationConfig(configWithAlias, apiConfig);
      res.json({ ok: true, result: payload });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      res.status(500).json({ ok: false, error: message });
    }
  });

  router.get("/api/entities", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const filter = q
      ? { $or: [{ entityId: new RegExp(escapeRegex(q), "i") }, { domain: new RegExp(escapeRegex(q), "i") }] }
      : {};
    const entities = await EntityModel.find(filter)
      .sort({ domain: 1, entityId: 1 })
      .limit(2000)
      .lean()
      .exec();
    res.json({ ok: true, count: entities.length, entities });
  });

  router.get("/api/ha/status", async (_req, res) => {
    try {
      const status = await hass.status();
      res.json({ ok: true, status });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Home Assistant error";
      res.status(500).json({ ok: false, error: message });
    }
  });

  router.get("/settings", (_req, res) => {
    res.render("settings", { title: "Settings – Smart Reminders" });
  });

  router.get("/api/settings", (_req, res) => {
    res.json({
      ok: true,
      settings: {
        openrouter_api_key: process.env.OPENROUTER_API_KEY || "",
        openrouter_model: process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview",
        openrouter_max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS || 2400),
        openrouter_temperature: Number(process.env.OPENROUTER_TEMPERATURE || 0.2)
      }
    });
  });

  router.post("/api/settings", (req, res) => {
    const {
      openrouter_api_key,
      openrouter_model,
      openrouter_max_tokens,
      openrouter_temperature
    } = req.body as Record<string, string>;

    // Update environment variables
    if (openrouter_api_key !== undefined) process.env.OPENROUTER_API_KEY = openrouter_api_key.trim();
    if (openrouter_model !== undefined) process.env.OPENROUTER_MODEL = openrouter_model.trim();
    if (openrouter_max_tokens !== undefined) process.env.OPENROUTER_MAX_TOKENS = openrouter_max_tokens.trim();
    if (openrouter_temperature !== undefined) process.env.OPENROUTER_TEMPERATURE = openrouter_temperature.trim();

    // Persist to /data/options.json so settings survive addon restart
    try {
      let existing: Record<string, unknown> = {};
      if (fs.existsSync(OPTIONS_PATH)) {
        existing = JSON.parse(fs.readFileSync(OPTIONS_PATH, "utf-8"));
      }
      const updated = {
        ...existing,
        openrouter_api_key: process.env.OPENROUTER_API_KEY || "",
        openrouter_model: process.env.OPENROUTER_MODEL || "",
        openrouter_max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS) || 2400,
        openrouter_temperature: Number(process.env.OPENROUTER_TEMPERATURE) || 0.2
      };
      fs.writeFileSync(OPTIONS_PATH, JSON.stringify(updated, null, 2), "utf-8");
    } catch (err) {
      // Non-fatal: env is already updated for this session
    }

    // Recreate OpenRouter client with new credentials
    openRouterRef.current = createOpenRouterClient();

    res.json({ ok: true, enabled: openRouterRef.current !== null });
  });

  return router;
}
