import mongoose from "mongoose";
import type { BookingRecord, BookingStatus } from "@shared/schema";

const bookingSchema = new mongoose.Schema<BookingRecord & { _id: mongoose.Types.ObjectId }>(
  {
    memberId: { type: String, required: true, ref: "Member" },
    scheduleId: { type: String, required: true, ref: "ScheduleSlot" },
    sessionDate: { type: String, required: true },
    status: {
      type: String,
      required: true,
      default: "BOOKED",
      enum: ["BOOKED", "CANCELLED", "ATTENDED", "ABSENT"] as BookingStatus[],
    },
    waitlistPosition: { type: Number, default: null },
  },
  { timestamps: true }
);

export const BookingModel = mongoose.model("Booking", bookingSchema);
