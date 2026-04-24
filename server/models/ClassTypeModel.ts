import mongoose from "mongoose";
import type { ClassType } from "../../shared/schema.js";

const classTypeSchema = new mongoose.Schema<ClassType & { _id: mongoose.Types.ObjectId }>(
  {
    name: { type: String, required: true, unique: true },
    ageGroup: { type: String, required: true },
    strengthLevel: { type: Number, required: true },
    infoBullets: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

export const ClassTypeModel = mongoose.model("ClassType", classTypeSchema);
