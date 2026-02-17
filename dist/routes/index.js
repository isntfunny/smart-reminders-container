"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexRouter = createIndexRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const zod_2 = require("openai/helpers/zod");
const yaml_1 = __importDefault(require("yaml"));
const homeAssistant_1 = require("../homeAssistant");
const Entity_1 = require("../models/Entity");
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const AutomationResponseSchema = zod_1.z.object({
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    yaml: zod_1.z.string()
});
function parseAutomationResponse(content) {
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
    }
    catch {
        // fall through to extraction
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        // fall through to code block / yaml parsing
    }
    else {
        const jsonSlice = trimmed.slice(firstBrace, lastBrace + 1);
        try {
            const parsed = JSON.parse(jsonSlice);
            const result = AutomationResponseSchema.safeParse(parsed);
            if (result.success) {
                return result.data;
            }
        }
        catch {
            // fall through to code block / yaml parsing
        }
    }
    const codeBlockMatch = trimmed.match(/```(?:json|yaml)?\s*([\s\S]*?)\s*```/i);
    const candidates = [codeBlockMatch?.[1], trimmed].filter(Boolean);
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            const result = AutomationResponseSchema.safeParse(parsed);
            if (result.success) {
                return result.data;
            }
        }
        catch {
            // ignore
        }
        try {
            const parsed = yaml_1.default.parse(candidate);
            const result = AutomationResponseSchema.safeParse(parsed);
            if (result.success) {
                return result.data;
            }
        }
        catch {
            // ignore
        }
    }
    return null;
}
function createIndexRouter(hass, _openRouter) {
    const router = (0, express_1.Router)();
    async function getBaseViewData(entityQuery) {
        let status = null;
        let error = null;
        let entities = [];
        try {
            status = await hass.status();
        }
        catch (err) {
            error = err instanceof Error ? err.message : "Unknown Home Assistant error";
        }
        if (entityQuery) {
            const escaped = escapeRegex(entityQuery);
            const pattern = new RegExp(escaped, "i");
            entities = await Entity_1.EntityModel.find({
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
        if (!_openRouter) {
            res.status(400).json({ ok: false, error: "OpenRouter ist nicht konfiguriert. Bitte OPENROUTER_API_KEY setzen." });
            return;
        }
        if (!prompt) {
            res.status(400).json({ ok: false, error: "Bitte eine Automation beschreiben." });
            return;
        }
        try {
            const entities = await Entity_1.EntityModel.find({}).sort({ lastSeen: -1 }).lean().exec();
            const systemPayload = JSON.stringify({
                generatedAt: new Date().toISOString(),
                entities
            }, null, 2);
            const refinementNote = mode === "refine" && baseYaml
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
            const completion = await _openRouter.client.responses.parse({
                model: _openRouter.model,
                input: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                text: { format: (0, zod_2.zodTextFormat)(AutomationResponseSchema, "automation") },
                max_output_tokens: _openRouter.maxTokens,
                temperature: _openRouter.temperature
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
        }
        catch (err) {
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
        const apiConfig = (0, homeAssistant_1.getHomeAssistantApiConfig)();
        if (!apiConfig) {
            res.status(400).json({ ok: false, error: "HA_TOKEN fehlt. Bitte in der Umgebung setzen." });
            return;
        }
        let automationConfig;
        try {
            automationConfig = yaml_1.default.parse(yaml);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Ungültiges YAML";
            res.status(400).json({ ok: false, error: message });
            return;
        }
        if (!automationConfig || typeof automationConfig !== "object" || Array.isArray(automationConfig)) {
            res.status(400).json({ ok: false, error: "YAML muss eine einzelne Automation (Objekt) enthalten." });
            return;
        }
        const configWithAlias = automationConfig;
        if (!configWithAlias.alias && title) {
            configWithAlias.alias = title;
        }
        try {
            const payload = await (0, homeAssistant_1.saveAutomationConfig)(configWithAlias, apiConfig);
            res.json({ ok: true, result: payload });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Unbekannter Fehler";
            res.status(500).json({ ok: false, error: message });
        }
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
