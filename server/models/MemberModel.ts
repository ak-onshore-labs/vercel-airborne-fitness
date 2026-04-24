import mongoose from "mongoose";
import type { Member, MemberType } from "../../shared/schema.js";

const memberSchema = new mongoose.Schema<Member & { _id: mongoose.Types.ObjectId }>(
  {
    userId: { type: String, required: true, ref: "User" },
    memberType: { type: String, required: true, enum: ["Kid", "Adult"] as MemberType[] },
    name: { type: String, default: null },
    dob: { type: String, default: null },
    gender: { type: String, default: null },
    email: { type: String, default: null },
    emergencyContactName: { type: String, default: null },
    emergencyContactPhone: { type: String, default: null },
    medicalConditions: { type: String, default: null },
  },
  { timestamps: true }
);

export const MemberModel = mongoose.model("Member", memberSchema);
