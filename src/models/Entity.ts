import mongoose from "mongoose";

const { Schema } = mongoose;

const EntitySchema = new Schema(
  {
    entityId: { type: String, required: true, unique: true, index: true },
    domain: { type: String, required: true, index: true },
    state: { type: String, default: null },
    attributes: { type: Schema.Types.Mixed, default: {} },
    attributeKeys: { type: [String], default: [] },
    lastSeen: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

export const EntityModel = mongoose.model("Entity", EntitySchema);
