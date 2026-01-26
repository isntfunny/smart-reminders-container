"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const EntitySchema = new Schema({
    entityId: { type: String, required: true, unique: true, index: true },
    domain: { type: String, required: true, index: true },
    state: { type: String, default: null },
    attributes: { type: Schema.Types.Mixed, default: {} },
    attributeKeys: { type: [String], default: [] },
    lastSeen: { type: Date, required: true, index: true }
}, { timestamps: true });
exports.EntityModel = mongoose_1.default.model("Entity", EntitySchema);
