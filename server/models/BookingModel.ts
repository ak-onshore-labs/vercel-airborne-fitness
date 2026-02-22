import mongoose from "mongoose";
import type { BookingRecord } from "@shared/schema";

const bookingSchema = new mongoose.Schema<BookingRecord & { _id: mongoose.Types.ObjectId }>(
  {
    memberId: { type: String, required: true, ref: "Member" },
    sessionDate: { type: String, required: true },
    scheduleId: { type: String, required: true },
    category: { type: String, required: true },
    branch: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, required: true, default: "BOOKED", enum: ["BOOKED", "WAITLISTED", "CANCELLED"] },
    waitlistPosition: { type: Number, default: null },
  },
  { timestamps: true }
);

export const BookingModel = mongoose.model("Booking", bookingSchema);
