"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexRouter = createIndexRouter;
const express_1 = require("express");
function createIndexRouter(hass) {
    const router = (0, express_1.Router)();
    router.get("/", async (_req, res) => {
        let status = null;
        let error = null;
        try {
            status = await hass.status();
        }
        catch (err) {
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
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Unknown Home Assistant error";
            res.status(500).json({ ok: false, error: message });
        }
    });
    return router;
}
