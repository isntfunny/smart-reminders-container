import { Router } from "express";
import type { HomeAssistantClient } from "../homeAssistant";
import { EntityModel } from "../models/Entity";
import type { OpenRouterClient } from "../openRouter";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createIndexRouter(hass: HomeAssistantClient): Router {
  const router = Router();

export function createIndexRouter(hass: HomeAssistantClient, openRouter: OpenRouterClient | null): Router {
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
      openRouterEnabled: Boolean(openRouter)
    };
  }

  router.get("/", async (req, res) => {
    const entityQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const baseData = await getBaseViewData(entityQuery);

    res.render("index", {
      ...baseData,
      openRouterPrompt: "",
      openRouterResponse: null,
      openRouterError: null
    });
  });

  router.post("/openrouter", async (req, res) => {
    const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
    const baseData = await getBaseViewData("");
    let openRouterResponse: string | null = null;
    let openRouterError: string | null = null;

    if (!openRouter) {
      openRouterError = "OpenRouter ist nicht konfiguriert. Bitte OPENROUTER_API_KEY setzen.";
    } else if (!prompt) {
      openRouterError = "Bitte eine Nachricht eingeben.";
    } else {
      try {
        const completion = await openRouter.client.chat.completions.create({
          model: openRouter.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: openRouter.maxTokens,
          temperature: openRouter.temperature
        });
        openRouterResponse = completion.choices[0]?.message?.content?.trim() || null;
      } catch (err) {
        openRouterError = err instanceof Error ? err.message : "Unbekannter OpenRouter Fehler";
      }
    }

    res.render("index", {
      ...baseData,
      openRouterPrompt: prompt,
      openRouterResponse,
      openRouterError
    });
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

  return router;
}
