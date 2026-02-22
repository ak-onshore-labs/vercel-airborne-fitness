import mongoose from "mongoose";
import type { Member } from "@shared/schema";

const memberSchema = new mongoose.Schema<Member & { _id: mongoose.Types.ObjectId }>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true, default: "" },
    email: { type: String, default: null },
    dob: { type: String, default: null },
    emergencyContactName: { type: String, default: null },
    emergencyContactPhone: { type: String, default: null },
    medicalConditions: { type: String, default: null },
  },
  { timestamps: true }
);

export const MemberModel = mongoose.model("Member", memberSchema);
