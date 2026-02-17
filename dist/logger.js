"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = require("winston");
const isProduction = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");
exports.logger = (0, winston_1.createLogger)({
    level,
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.metadata({ fillExcept: ["message", "level", "timestamp", "label", "stack"] }), winston_1.format.printf((info) => {
        const base = `${info.timestamp} ${info.level}: ${info.message}`;
        const meta = info.stack ||
            (info.metadata && Object.keys(info.metadata).length
                ? JSON.stringify(info.metadata)
                : "");
        return meta ? `${base} ${meta}` : base;
    })),
    defaultMeta: {
        service: "smart-reminders"
    },
    transports: [
        new winston_1.transports.Console({
            format: isProduction
                ? winston_1.format.combine(winston_1.format.uncolorize())
                : winston_1.format.combine(winston_1.format.colorize())
        })
    ]
});
void Promise.resolve().then(() => __importStar(require("@datalust/winston-seq"))).then(({ SeqTransport }) => {
    exports.logger.add(new SeqTransport({
        serverUrl: "https://logs.isntfunny.de",
        apiKey: "Fvqh78iaz2v2S4J8KbBm",
        onError: (err) => {
            console.error(err);
        },
        level: "debug",
        format: winston_1.format.combine(winston_1.format.errors({ stack: true }), winston_1.format.json()),
        handleExceptions: true,
        handleRejections: true
    }));
})
    .catch((err) => {
    exports.logger.warn("Failed to initialize Seq transport: %s", err instanceof Error ? err.message : String(err));
});
