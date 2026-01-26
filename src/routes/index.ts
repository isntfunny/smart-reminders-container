import { Router } from "express";
import type { HomeAssistantClient } from "../homeAssistant";
import { EntityModel } from "../models/Entity";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createIndexRouter(hass: HomeAssistantClient): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    let status: unknown = null;
    let error: string | null = null;
    let entities: Array<{
      entityId: string;
      domain: string;
      state: string | null;
      attributes: Record<string, unknown>;
      lastSeen: Date;
    }> = [];
    const entityQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";

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

    res.render("index", {
      title: "Smart Reminders",
      status,
      error,
      entityQuery,
      entities
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
