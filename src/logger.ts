import { createLogger, format, transports } from "winston";
import { SeqTransport } from "@datalust/winston-seq";

const isProduction = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

export const logger = createLogger({
  level,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.metadata({ fillExcept: ["message", "level", "timestamp", "label", "stack"] }),
    format.printf((info) => {
      const base = `${info.timestamp} ${info.level}: ${info.message}`;
      const meta =
        info.stack ||
        (info.metadata && Object.keys(info.metadata).length
          ? JSON.stringify(info.metadata)
          : "");
      return meta ? `${base} ${meta}` : base;
    })
  ),
  defaultMeta: {
    service: "smart-reminders"
  },
  transports: [
    new transports.Console({
      format: isProduction
        ? format.combine(format.uncolorize())
        : format.combine(format.colorize())
    }),
    new SeqTransport({
      serverUrl: "https://logs.isntfunny.de",
      apiKey: "Fvqh78iaz2v2S4J8KbBm",
      onError: (err) => {
        console.error(err);
      },
      level: "debug",
      format: format.combine(
        format.errors({ stack: true }),
        format.json()
      ),
      handleExceptions: true,
      handleRejections: true
    })
  ]
});
