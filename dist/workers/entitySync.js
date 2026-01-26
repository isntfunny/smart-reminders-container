"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEntitySyncWorker = startEntitySyncWorker;
const Entity_1 = require("../models/Entity");
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
        states = await hass.getStates();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown Home Assistant error";
        console.error("Failed to fetch Home Assistant states:", message);
        return;
    }
    if (!Array.isArray(states)) {
        console.warn("Unexpected Home Assistant states response; expected array.");
        return;
    }
    const ops = states
        .filter((entry) => {
        return Boolean(entry && typeof entry === "object" && "entity_id" in entry);
    })
        .map((entry) => {
        const entityId = String(entry.entity_id);
        const attributes = toAttributes(entry.attributes);
        const attributeKeys = Object.keys(attributes);
        const update = {
            $set: {
                entityId,
                domain: getDomain(entityId),
                state: entry.state ?? null,
                attributes,
                lastSeen: now
            },
            $setOnInsert: {
                attributeKeys: []
            }
        };
        if (attributeKeys.length) {
            update.$addToSet = { attributeKeys: { $each: attributeKeys } };
        }
        return {
            updateOne: {
                filter: { entityId },
                update,
                upsert: true,
                setDefaultsOnInsert: true
            }
        };
    });
    if (ops.length) {
        try {
            await Entity_1.EntityModel.bulkWrite(ops, { ordered: false });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Unknown MongoDB error";
            console.error("Failed to upsert Home Assistant entities:", message);
        }
    }
    const staleMs = Math.max(staleDays, 1) * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - staleMs);
    try {
        await Entity_1.EntityModel.deleteMany({ lastSeen: { $lt: cutoff } });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown MongoDB error";
        console.error("Failed to remove stale entities:", message);
    }
}
function startEntitySyncWorker(hass) {
    const intervalMs = Number(process.env.ENTITY_SYNC_INTERVAL_MS || DEFAULT_INTERVAL_MS);
    const staleDays = Number(process.env.ENTITY_STALE_DAYS || DEFAULT_STALE_DAYS);
    void syncEntities(hass, staleDays);
    setInterval(() => {
        void syncEntities(hass, staleDays);
    }, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS);
}
