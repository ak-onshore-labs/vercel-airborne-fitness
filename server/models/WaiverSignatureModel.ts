import mongoose from "mongoose";
import type { WaiverSignature } from "@shared/schema";

const waiverSignatureSchema = new mongoose.Schema<WaiverSignature & { _id: mongoose.Types.ObjectId }>(
  {
    memberId: { type: String, required: true, ref: "Member" },
    signatureName: { type: String, required: true },
    agreedTerms: { type: Boolean, default: false },
    agreedAge: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const WaiverSignatureModel = mongoose.model("WaiverSignature", waiverSignatureSchema);
