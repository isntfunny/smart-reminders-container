import type { HomeAssistantClient } from "../homeAssistant";
import { EntityModel } from "../models/Entity";
import { logger } from "../logger";

type HomeAssistantEntityState = {
  entity_id: string;
  state?: string;
  attributes?: Record<string, unknown>;
};

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_STALE_DAYS = 7;

function getDomain(entityId: string): string {
  const parts = entityId.split(".");
  return parts.length > 1 ? parts[0] : "unknown";
}

function toAttributes(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

async function syncEntities(hass: HomeAssistantClient, staleDays: number): Promise<void> {
  const now = new Date();
  let states: unknown;

  try {
    states = await hass.states.list();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Home Assistant error";
    logger.error("Failed to fetch Home Assistant states: %s", message);
    return;
  }

  if (!Array.isArray(states)) {
    logger.warn("Unexpected Home Assistant states response; expected array.");
    return;
  }

  logger.debug("Fetched %d Home Assistant states", states.length);

  const ops = states
    .filter((entry): entry is HomeAssistantEntityState => {
      return Boolean(entry && typeof entry === "object" && "entity_id" in entry);
    })
    .map((entry) => {
      const entityId = String(entry.entity_id);
      const attributes = toAttributes(entry.attributes);
      const attributeKeys = Object.keys(attributes);
      const setFields: Record<string, unknown> = {
        entityId,
        domain: getDomain(entityId),
        state: entry.state ?? null,
        lastSeen: now
      };

      if (attributeKeys.length) {
        for (const key of attributeKeys) {
          setFields[`attributes.${key}`] = attributes[key];
        }
      }

      const update: Record<string, unknown> = { $set: setFields };

      if (attributeKeys.length) {
        update.$addToSet = { attributeKeys: { $each: attributeKeys } };
      } else {
        update.$setOnInsert = { attributeKeys: [], attributes: {} };
      }

      return {
        updateOne: {
          filter: { entityId },
          update,
          upsert: true
        }
      };
    });

  if (ops.length) {
    try {
      const result = await EntityModel.bulkWrite(ops, { ordered: false });
      logger.info(
        "Upserted Home Assistant entities: %d matched, %d upserted, %d modified",
        result.matchedCount,
        result.upsertedCount,
        result.modifiedCount
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown MongoDB error";
      logger.error("Failed to upsert Home Assistant entities: %s", message);
    }
  } else {
    logger.warn("No valid Home Assistant entities to upsert");
  }

  const staleMs = Math.max(staleDays, 1) * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - staleMs);

  try {
    const result = await EntityModel.deleteMany({ lastSeen: { $lt: cutoff } });
    if (result.deletedCount) {
      logger.info("Removed %d stale entities", result.deletedCount);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown MongoDB error";
    logger.error("Failed to remove stale entities: %s", message);
  }
}

export function startEntitySyncWorker(hass: HomeAssistantClient): void {
  const intervalMs = Number(process.env.ENTITY_SYNC_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const staleDays = Number(process.env.ENTITY_STALE_DAYS || DEFAULT_STALE_DAYS);

  logger.info(
    "Starting entity sync worker (interval=%dms, staleDays=%d)",
    intervalMs,
    staleDays
  );

  void syncEntities(hass, staleDays);

  setInterval(() => {
    void syncEntities(hass, staleDays);
  }, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS);
}
