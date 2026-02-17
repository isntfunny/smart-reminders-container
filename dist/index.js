"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const homeAssistant_1 = require("./homeAssistant");
const openRouter_1 = require("./openRouter");
const index_1 = require("./routes/index");
const entitySync_1 = require("./workers/entitySync");
const logger_1 = require("./logger");
dotenv_1.default.config();
// Load Home Assistant add-on options if available
function loadHassioOptions() {
    const optionsPath = "/data/options.json";
    if (fs_1.default.existsSync(optionsPath)) {
        try {
            const options = JSON.parse(fs_1.default.readFileSync(optionsPath, "utf-8"));
            logger_1.logger.info("Loaded Home Assistant add-on options");
            return options;
        }
        catch (err) {
            logger_1.logger.warn("Failed to load Home Assistant add-on options: %s", err);
        }
    }
    return {};
}
const hassioOptions = loadHassioOptions();
// Environment variables with Home Assistant add-on support
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 3000);
const mongoUrl = process.env.MONGO_URL || hassioOptions.mongo_url || "mongodb://localhost:27017/smart_reminders";
// Set Home Assistant add-on options as environment variables for other modules
if (hassioOptions.ha_url)
    process.env.HA_URL = hassioOptions.ha_url;
if (hassioOptions.ha_token)
    process.env.HA_TOKEN = hassioOptions.ha_token;
if (hassioOptions.openrouter_api_key)
    process.env.OPENROUTER_API_KEY = hassioOptions.openrouter_api_key;
if (hassioOptions.openrouter_model)
    process.env.OPENROUTER_MODEL = hassioOptions.openrouter_model;
if (hassioOptions.openrouter_max_tokens)
    process.env.OPENROUTER_MAX_TOKENS = String(hassioOptions.openrouter_max_tokens);
if (hassioOptions.openrouter_temperature)
    process.env.OPENROUTER_TEMPERATURE = String(hassioOptions.openrouter_temperature);
if (hassioOptions.openrouter_cache_control_type)
    process.env.OPENROUTER_CACHE_CONTROL_TYPE = hassioOptions.openrouter_cache_control_type;
if (hassioOptions.openrouter_cache_control_ttl)
    process.env.OPENROUTER_CACHE_CONTROL_TTL = hassioOptions.openrouter_cache_control_ttl;
if (hassioOptions.openrouter_site_url)
    process.env.OPENROUTER_SITE_URL = hassioOptions.openrouter_site_url;
if (hassioOptions.openrouter_site_name)
    process.env.OPENROUTER_SITE_NAME = hassioOptions.openrouter_site_name;
// Get ingress path from HA header
const ingressPath = process.env.ingress_path || "";
app.set("views", path_1.default.join(__dirname, "..", "views"));
app.set("view engine", "pug");
// Serve static files both at root (for direct access) and at ingress path
app.use(express_1.default.static(path_1.default.join(__dirname, "..", "public")));
app.use(ingressPath, express_1.default.static(path_1.default.join(__dirname, "..", "public")));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(ingressPath, express_1.default.json());
app.use(ingressPath, express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
        const durationMs = Date.now() - startedAt;
        logger_1.logger.info("%s %s %s %dms", req.method, req.originalUrl, res.statusCode, durationMs, {
            ip: req.ip
        });
    });
    next();
});
const hass = (0, homeAssistant_1.createHomeAssistantClient)();
const openRouter = (0, openRouter_1.createOpenRouterClient)();
const indexRouter = (0, index_1.createIndexRouter)(hass, openRouter);
if (ingressPath) {
    app.use(ingressPath, indexRouter);
}
else {
    app.use(indexRouter);
}
async function start() {
    try {
        await mongoose_1.default.connect(mongoUrl);
        logger_1.logger.info("Connected to MongoDB");
        (0, entitySync_1.startEntitySyncWorker)(hass);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown MongoDB error";
        logger_1.logger.error("MongoDB connection failed: %s", message);
    }
    app.listen(port, () => {
        logger_1.logger.info("Server listening on port %d", port);
    });
}
start();
