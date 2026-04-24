import mongoose from "mongoose";
import type { Membership } from "../../shared/schema.js";

const membershipSchema = new mongoose.Schema<Membership & { _id: mongoose.Types.ObjectId }>(
  {
    memberId: { type: String, required: true, ref: "Member" },
    membershipPlanId: { type: String, required: true, ref: "MembershipPlan" },
    sessionsRemaining: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    carryForward: { type: Number, required: true, default: 0 },
    extensionRequestedAt: { type: Date, default: null },
    extensionApprovedAt: { type: Date, default: null },
    extensionApplied: { type: Boolean, default: false },
    pauseUsed: { type: Boolean, default: false },
    pauseStart: { type: Date, default: null },
    pauseEnd: { type: Date, default: null },
    startDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export const MembershipModel = mongoose.model("Membership", membershipSchema);
