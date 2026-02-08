import { Router } from "express";
import type { HomeAssistantClient } from "../homeAssistant";
import { EntityModel } from "../models/Entity";
import type { OpenRouterClient } from "../openRouter";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type AutomationResponse = {
  title: string;
  message: string;
  yaml: string;
};

function parseAutomationResponse(content: string): AutomationResponse | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as AutomationResponse;
    if (parsed && parsed.title && parsed.message && parsed.yaml) {
      return parsed;
    }
  } catch {
    // fall through to extraction
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonSlice = trimmed.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(jsonSlice) as AutomationResponse;
    if (parsed && parsed.title && parsed.message && parsed.yaml) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function createIndexRouter(hass: HomeAssistantClient, _openRouter: OpenRouterClient | null): Router {
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

    if (!_openRouter) {
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

      const systemPrompt = [
        "Du bist ein Assistent für Home Assistant Automationen.",
        "Erstelle eine passende Automation basierend auf dem Nutzerwunsch und den Entitäten.",
        "Antworte ausschließlich mit einem JSON-Objekt im Format:",
        '{"title":"...","message":"...","yaml":"..."}',
        "Nutze im YAML nur Entitäten aus den bereitgestellten Daten.",
        "Hier sind ALLE Entitäten aus der MongoDB im JSON-Format:",
        systemPayload
      ].join("\n");

      const systemContent = _openRouter.cacheControl
        ? [
            {
              type: "text",
              text: systemPrompt,
              cache_control: _openRouter.cacheControl
            }
          ]
        : systemPrompt;

      const completion = await _openRouter.client.chat.completions.create({
        model: _openRouter.model,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: prompt }
        ],
        max_tokens: _openRouter.maxTokens,
        temperature: _openRouter.temperature
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const parsed = parseAutomationResponse(content);

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

  router.get("/api/ha/status", async (_req, res) => {
    try {
      const status = await hass.status();
      res.json({ ok: true, status });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Home Assistant error";
      res.status(500).json({ ok: false, error: message });
    }
  });

  router.post("/api/automation/mock", (_req, res) => {
    res.json({
      ok: true,
      title: "Abendroutine: Fenster & Licht",
      message:
        "Ich habe eine Automation erstellt, die um 22:00 Uhr prüft, ob ein Fenster offen ist und dann das Licht im Flur einschaltet sowie eine Benachrichtigung sendet.",
      yaml: `alias: Abendroutine Fenstercheck
description: >
  Prüft um 22:00 Uhr offene Fenster und schaltet das Flurlicht ein.
trigger:
  - platform: time
    at: "22:00:00"
condition:
  - condition: state
    entity_id: binary_sensor.window_living_room
    state: "on"
action:
  - service: light.turn_on
    target:
      entity_id: light.hallway
  - service: notify.mobile_app_phone
    data:
      title: "Fenster offen"
      message: "Bitte das Wohnzimmerfenster schließen."
mode: single`
    });
  });

  return router;
}
