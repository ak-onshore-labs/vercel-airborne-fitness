import mongoose from "mongoose";
import type { MembershipPlan } from "../../shared/schema.js";

const membershipPlanSchema = new mongoose.Schema<MembershipPlan & { _id: mongoose.Types.ObjectId }>(
  {
    classTypeId: { type: String, required: true, ref: "ClassType" },
    name: { type: String, required: true },
    sessionsTotal: { type: Number, required: true },
    validityDays: { type: Number, required: true },
    price: { type: Number, required: true },
    gstInclusive: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

export const MembershipPlanModel = mongoose.model("MembershipPlan", membershipPlanSchema);
