import { Router } from "express";
import type { HomeAssistantClient } from "../homeAssistant";

export function createIndexRouter(hass: HomeAssistantClient): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    let status: unknown = null;
    let error: string | null = null;

    try {
      status = await hass.status();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown Home Assistant error";
    }

    res.render("index", {
      title: "Smart Reminders",
      status,
      error
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
