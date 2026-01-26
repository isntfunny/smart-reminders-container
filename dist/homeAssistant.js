"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHomeAssistantClient = createHomeAssistantClient;
const homeassistant_1 = __importDefault(require("homeassistant"));
function createHomeAssistantClient() {
    const haUrl = process.env.HA_URL || "http://localhost:8123";
    const token = process.env.HA_TOKEN;
    const parsed = new URL(haUrl);
    const host = `${parsed.protocol}//${parsed.hostname}`;
    const port = parsed.port ? Number(parsed.port) : 8123;
    return new homeassistant_1.default({
        host,
        port,
        token,
        ignoreCert: parsed.protocol === "https:" && parsed.hostname === "localhost"
    });
}
