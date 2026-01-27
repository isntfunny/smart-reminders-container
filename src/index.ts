import path from "path";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createHomeAssistantClient } from "./homeAssistant";
import { createOpenRouterClient } from "./openRouter";
import { createIndexRouter } from "./routes/index";
import { startEntitySyncWorker } from "./workers/entitySync";
import { logger } from "./logger";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/smart_reminders";

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
