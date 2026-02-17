"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEntitySyncWorker = startEntitySyncWorker;
const Entity_1 = require("../models/Entity");
const logger_1 = require("../logger");
const DEFAULT_INTERVAL_MS = 60000;
const DEFAULT_STALE_DAYS = 7;
function getDomain(entityId) {
    const parts = entityId.split(".");
    return parts.length > 1 ? parts[0] : "unknown";
}
function toAttributes(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    return value;
}
async function syncEntities(hass, staleDays) {
    const now = new Date();
    let states;
    try {
        states = await hass.states.list();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown Home Assistant error";
        logger_1.logger.error("Failed to fetch Home Assistant states: %s", message);
        return;
    }
    if (!Array.isArray(states)) {
        logger_1.logger.warn("Unexpected Home Assistant states response; expected array.");
        return;
    }
    logger_1.logger.debug("Fetched %d Home Assistant states", states.length);
    const ops = states
        .filter((entry) => {
        return Boolean(entry && typeof entry === "object" && "entity_id" in entry);
    })
        .map((entry) => {
        const entityId = String(entry.entity_id);
        const attributes = toAttributes(entry.attributes);
        const attributeKeys = Object.keys(attributes);
        const setFields = {
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
        const update = { $set: setFields };
        if (attributeKeys.length) {
            update.$addToSet = { attributeKeys: { $each: attributeKeys } };
        }
        else {
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
            const result = await Entity_1.EntityModel.bulkWrite(ops, { ordered: false });
            logger_1.logger.info("Upserted Home Assistant entities: %d matched, %d upserted, %d modified", result.matchedCount, result.upsertedCount, result.modifiedCount);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Unknown MongoDB error";
            logger_1.logger.error("Failed to upsert Home Assistant entities: %s", message);
        }
    }
    else {
        logger_1.logger.warn("No valid Home Assistant entities to upsert");
    }
    const staleMs = Math.max(staleDays, 1) * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - staleMs);
    try {
        const result = await Entity_1.EntityModel.deleteMany({ lastSeen: { $lt: cutoff } });
        if (result.deletedCount) {
            logger_1.logger.info("Removed %d stale entities", result.deletedCount);
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown MongoDB error";
        logger_1.logger.error("Failed to remove stale entities: %s", message);
    }
}
function startEntitySyncWorker(hass) {
    const intervalMs = Number(process.env.ENTITY_SYNC_INTERVAL_MS || DEFAULT_INTERVAL_MS);
    const staleDays = Number(process.env.ENTITY_STALE_DAYS || DEFAULT_STALE_DAYS);
    logger_1.logger.info("Starting entity sync worker (interval=%dms, staleDays=%d)", intervalMs, staleDays);
    void syncEntities(hass, staleDays);
    setInterval(() => {
        void syncEntities(hass, staleDays);
    }, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS);
}
