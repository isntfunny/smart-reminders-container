"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenRouterClient = createOpenRouterClient;
const openai_1 = __importDefault(require("openai"));
function createOpenRouterClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return null;
    }
    const model = process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview";
    const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS || 2400);
    const temperature = Number(process.env.OPENROUTER_TEMPERATURE || 0.2);
    const cacheControlType = process.env.OPENROUTER_CACHE_CONTROL_TYPE;
    const cacheControlTtl = process.env.OPENROUTER_CACHE_CONTROL_TTL;
    const siteUrl = process.env.OPENROUTER_SITE_URL;
    const siteName = process.env.OPENROUTER_SITE_NAME;
    const defaultHeaders = {};
    if (siteUrl) {
        defaultHeaders["HTTP-Referer"] = siteUrl;
    }
    if (siteName) {
        defaultHeaders["X-Title"] = siteName;
    }
    const client = new openai_1.default({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders
    });
    const cacheControl = cacheControlType === "ephemeral"
        ? {
            type: "ephemeral",
            ttl: cacheControlTtl || undefined
        }
        : undefined;
    return {
        client,
        model,
        maxTokens,
        temperature,
        cacheControl
    };
}
