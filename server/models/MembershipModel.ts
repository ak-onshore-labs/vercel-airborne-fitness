import mongoose from "mongoose";
import type { Membership } from "@shared/schema";

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
  },
  { timestamps: true }
);

export const MembershipModel = mongoose.model("Membership", membershipSchema);
