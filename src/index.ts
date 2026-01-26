import path from "path";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createHomeAssistantClient } from "./homeAssistant";
import { createIndexRouter } from "./routes/index";
import { startEntitySyncWorker } from "./workers/entitySync";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/smart_reminders";

app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());

const hass = createHomeAssistantClient();
app.use("/", createIndexRouter(hass));

async function start() {
  try {
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB");
    startEntitySyncWorker(hass);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown MongoDB error";
    console.error("MongoDB connection failed:", message);
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start();
