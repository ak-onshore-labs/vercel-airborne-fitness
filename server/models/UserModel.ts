import mongoose from "mongoose";
import type { User, UserRole } from "@shared/schema";

const userSchema = new mongoose.Schema<User & { _id: mongoose.Types.ObjectId }>(
  {
    name: { type: String, required: false, default: "" },
    mobile: { type: String, required: true, unique: true },
    gender: { type: String, required: false, default: "" },
    userRole: { type: String, required: true, enum: ["ADMIN", "STAFF", "MEMBER"] as UserRole[], default: "MEMBER" },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", userSchema);
