import mongoose from "mongoose";
import type { KidDetail } from "@shared/schema";

const kidDetailSchema = new mongoose.Schema<KidDetail & { _id: mongoose.Types.ObjectId }>(
  {
    memberId: { type: String, required: true, ref: "Member" },
    kidName: { type: String, required: true },
    kidDob: { type: String, required: true },
    kidGender: { type: String, required: true },
  },
  { timestamps: true }
);

export const KidDetailModel = mongoose.model("KidDetail", kidDetailSchema);
