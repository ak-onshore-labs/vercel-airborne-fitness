import mongoose from "mongoose";
import type { Membership } from "@shared/schema";

const membershipSchema = new mongoose.Schema<Membership & { _id: mongoose.Types.ObjectId }>(
  {
    memberId: { type: String, required: true, ref: "Member" },
    category: { type: String, required: true },
    planName: { type: String, required: true },
    sessionsTotal: { type: Number, required: true },
    sessionsRemaining: { type: Number, required: true },
    price: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    extensionRequestedAt: { type: Date, default: null },
    extensionApprovedAt: { type: Date, default: null },
    extensionApplied: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const MembershipModel = mongoose.model("Membership", membershipSchema);
