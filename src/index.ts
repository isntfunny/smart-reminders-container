import path from "path";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import { createHomeAssistantClient } from "./homeAssistant";
import { createOpenRouterClient } from "./openRouter";
import { createIndexRouter } from "./routes/index";
import { startEntitySyncWorker } from "./workers/entitySync";
import { logger } from "./logger";

dotenv.config();

// Load Home Assistant add-on options if available
function loadHassioOptions() {
  const optionsPath = "/data/options.json";
  if (fs.existsSync(optionsPath)) {
    try {
      const options = JSON.parse(fs.readFileSync(optionsPath, "utf-8"));
      logger.info("Loaded Home Assistant add-on options");
      return options;
    } catch (err) {
      logger.warn("Failed to load Home Assistant add-on options: %s", err);
    }
  }
  return {};
}

const hassioOptions = loadHassioOptions();

// Environment variables with Home Assistant add-on support
const app = express();
const port = Number(process.env.PORT || 3000);
const mongoUrl = process.env.MONGO_URL || hassioOptions.mongo_url || "mongodb://localhost:27017/smart_reminders";

// Set Home Assistant add-on options as environment variables for other modules
if (hassioOptions.ha_url) process.env.HA_URL = hassioOptions.ha_url;
if (hassioOptions.ha_token) process.env.HA_TOKEN = hassioOptions.ha_token;
if (hassioOptions.openrouter_api_key) process.env.OPENROUTER_API_KEY = hassioOptions.openrouter_api_key;
if (hassioOptions.openrouter_model) process.env.OPENROUTER_MODEL = hassioOptions.openrouter_model;
if (hassioOptions.openrouter_max_tokens) process.env.OPENROUTER_MAX_TOKENS = String(hassioOptions.openrouter_max_tokens);
if (hassioOptions.openrouter_temperature) process.env.OPENROUTER_TEMPERATURE = String(hassioOptions.openrouter_temperature);
if (hassioOptions.openrouter_cache_control_type) process.env.OPENROUTER_CACHE_CONTROL_TYPE = hassioOptions.openrouter_cache_control_type;
if (hassioOptions.openrouter_cache_control_ttl) process.env.OPENROUTER_CACHE_CONTROL_TTL = hassioOptions.openrouter_cache_control_ttl;
if (hassioOptions.openrouter_site_url) process.env.OPENROUTER_SITE_URL = hassioOptions.openrouter_site_url;
if (hassioOptions.openrouter_site_name) process.env.OPENROUTER_SITE_NAME = hassioOptions.openrouter_site_name;

app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    logger.info("%s %s %s %dms", req.method, req.originalUrl, res.statusCode, durationMs, {
      ip: req.ip
    });
  });
  next();
});

const hass = createHomeAssistantClient();
const openRouter = createOpenRouterClient();
app.use("/", createIndexRouter(hass, openRouter));

async function start() {
  try {
    await mongoose.connect(mongoUrl);
    logger.info("Connected to MongoDB");
    startEntitySyncWorker(hass);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown MongoDB error";
    logger.error("MongoDB connection failed: %s", message);
  }

  app.listen(port, () => {
    logger.info("Server listening on port %d", port);
  });
}

start();
