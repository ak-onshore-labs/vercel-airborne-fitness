import mongoose from "mongoose";
import type { ScheduleSlot } from "../../shared/schema.js";

const scheduleSlotSchema = new mongoose.Schema<ScheduleSlot & { _id: mongoose.Types.ObjectId }>(
  {
    classTypeId: { type: String, required: true, ref: "ClassType" },
    branch: { type: String, required: true },
    dayOfWeek: { type: Number, required: true },
    startHour: { type: Number, required: true },
    startMinute: { type: Number, default: 0 },
    endHour: { type: Number, required: true },
    endMinute: { type: Number, default: 0 },
    capacity: { type: Number, default: 14 },
    isActive: { type: Boolean, default: true },
    genderRestriction: { type: String, enum: ["NONE", "FEMALE_ONLY"], default: "NONE" },
    notes: { type: String, default: null },
  },
  { _id: true }
);

export const ScheduleSlotModel = mongoose.model("ScheduleSlot", scheduleSlotSchema);
