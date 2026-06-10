import mongoose from "mongoose";
import type { BookingRecord, BookingStatus } from "../../shared/schema.js";

const bookingSchema = new mongoose.Schema<BookingRecord & { _id: mongoose.Types.ObjectId }>(
  {
    memberId: { type: String, required: true, ref: "Member" },
    scheduleId: { type: String, required: true, ref: "ScheduleSlot" },
    sessionDate: { type: String, required: true },
    status: {
      type: String,
      required: true,
      default: "BOOKED",
      enum: ["BOOKED", "CANCELLED", "ATTENDED", "ABSENT", "WAITLIST"] as BookingStatus[],
    },
    waitlistPosition: { type: Number, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ scheduleId: 1, sessionDate: 1, status: 1 });
bookingSchema.index({ memberId: 1, sessionDate: 1 });
bookingSchema.index({ memberId: 1, status: 1 });

export const BookingModel = mongoose.model("Booking", bookingSchema);
