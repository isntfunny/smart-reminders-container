"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHomeAssistantClient = createHomeAssistantClient;
exports.getHomeAssistantApiConfig = getHomeAssistantApiConfig;
exports.saveAutomationConfig = saveAutomationConfig;
const homeassistant_1 = __importDefault(require("homeassistant"));
const logger_1 = require("./logger");
function createHomeAssistantClient() {
    const haUrl = process.env.HA_URL || "http://localhost:8123";
    const token = process.env.HA_TOKEN;
    const parsed = new URL(haUrl);
    const host = `${parsed.protocol}//${parsed.hostname}`;
    const port = parsed.port ? Number(parsed.port) : 8123;
    const ignoreCert = parsed.protocol === "https:" && parsed.hostname === "localhost";
    logger_1.logger.info("Home Assistant client configured for %s:%d", host, port);
    return new homeassistant_1.default({
        host,
        port,
        token,
        ignoreCert
    });
}
function getHomeAssistantApiConfig() {
    const haUrl = process.env.HA_URL || "http://localhost:8123";
    const token = process.env.HA_TOKEN;
    if (!token) {
        return null;
    }
    const parsed = new URL(haUrl);
    const host = `${parsed.protocol}//${parsed.hostname}`;
    const port = parsed.port ? Number(parsed.port) : 8123;
    return {
        baseUrl: `${host}:${port}`,
        token
    };
}
async function saveAutomationConfig(config, apiConfig) {
    const resolved = apiConfig ?? getHomeAssistantApiConfig();
    if (!resolved) {
        throw new Error("HA_TOKEN fehlt. Bitte in der Umgebung setzen.");
    }
    const response = await fetch(`${resolved.baseUrl}/api/config/automation/config`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resolved.token}`
        },
        body: JSON.stringify(config)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const errorMessage = payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : `Home Assistant Fehler (${response.status})`;
        throw new Error(errorMessage);
    }
    return payload;
}
