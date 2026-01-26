"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const homeAssistant_1 = require("./homeAssistant");
const index_1 = require("./routes/index");
const entitySync_1 = require("./workers/entitySync");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 3000);
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/smart_reminders";
app.set("views", path_1.default.join(__dirname, "..", "views"));
app.set("view engine", "pug");
app.use(express_1.default.static(path_1.default.join(__dirname, "..", "public")));
app.use(express_1.default.json());
const hass = (0, homeAssistant_1.createHomeAssistantClient)();
app.use("/", (0, index_1.createIndexRouter)(hass));
async function start() {
    try {
        await mongoose_1.default.connect(mongoUrl);
        console.log("Connected to MongoDB");
        (0, entitySync_1.startEntitySyncWorker)(hass);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown MongoDB error";
        console.error("MongoDB connection failed:", message);
    }
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}
start();
