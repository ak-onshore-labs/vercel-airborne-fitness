import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../middleware";

export function registerManageSessionRoutes(app: Express): void {
  // Schedule
  app.get("/api/schedule", asyncHandler(async (req: Request, res: Response) => {
    const branch = req.query.branch as string | undefined;
    const date = req.query.date as string | undefined;
    if (branch && date) {
      const sessions = await storage.getScheduleForBranchAndDate(branch, date);
      return res.json({ sessions });
    }
    const schedule = await storage.getSchedule();
    res.json(schedule);
  }));

  // Bookings
  app.get("/api/bookings/:memberId", asyncHandler(async (req: Request, res: Response) => {
    const result = await storage.getBookingsForMember(req.params.memberId);
    res.json(result);
  }));

  app.get("/api/session-bookings", asyncHandler(async (req: Request, res: Response) => {
    const { scheduleId, date } = req.query;
    if (!scheduleId || !date) return res.status(400).json({ message: "Missing params" });
    const result = await storage.getBookingsForSession(scheduleId as string, date as string);
    const booked = result.filter(b => b.status === "BOOKED").length;
    const waitlisted = result.filter(b => b.status === "WAITLISTED").length;
    res.json({ bookedCount: booked, waitlistCount: waitlisted });
  }));

  // Book session
  app.post("/api/book", asyncHandler(async (req: Request, res: Response) => {
    const { memberId, scheduleId, sessionDate, category, branch, startTime, endTime } = req.body;
    if (!memberId || !scheduleId || !sessionDate || !category || !branch) {
      return res.status(400).json({ message: "Missing booking data" });
    }

    const slot = await storage.getScheduleSlot(scheduleId);
    if (!slot) return res.status(400).json({ message: "Invalid schedule slot" });
    const capacity = slot.capacity;
    const existingBookings = await storage.getBookingsForSession(scheduleId, sessionDate);
    const bookedCount = existingBookings.filter(b => b.status === "BOOKED").length;

    const alreadyBooked = existingBookings.find(b => b.memberId === memberId && b.status !== "CANCELLED");
    if (alreadyBooked) {
      return res.status(409).json({ message: "Already booked or waitlisted", booking: alreadyBooked });
    }

    const memberMemberships = await storage.getMemberMemberships(memberId);
    const membership = memberMemberships.find(m => m.category === category);
    if (!membership || membership.sessionsRemaining <= 0) {
      return res.status(400).json({ message: "No sessions remaining" });
    }

    if (bookedCount >= capacity) {
      return res.status(400).json({ message: "Session is full. Use waitlist endpoint." });
    }

    await storage.updateMembershipSessions(membership.id, membership.sessionsRemaining - 1);

    const booking = await storage.createBooking({
      memberId,
      scheduleId,
      sessionDate,
      category,
      branch,
      startTime,
      endTime,
      status: "BOOKED",
    });

    res.json(booking);
  }));

  // Waitlist
  app.post("/api/waitlist", asyncHandler(async (req: Request, res: Response) => {
    const { memberId, scheduleId, sessionDate, category, branch, startTime, endTime } = req.body;

    const existingBookings = await storage.getBookingsForSession(scheduleId, sessionDate);
    const alreadyBooked = existingBookings.find(b => b.memberId === memberId && b.status !== "CANCELLED");
    if (alreadyBooked) {
      return res.status(409).json({ message: "Already booked or waitlisted" });
    }

    const waitlistCount = existingBookings.filter(b => b.status === "WAITLISTED").length;
    const position = waitlistCount + 1;

    const booking = await storage.createBooking({
      memberId,
      scheduleId,
      sessionDate,
      category,
      branch,
      startTime,
      endTime,
      status: "WAITLISTED",
      waitlistPosition: position,
    });

    res.json(booking);
  }));

  // Cancel booking
  app.post("/api/cancel", asyncHandler(async (req: Request, res: Response) => {
    const { bookingId, memberId } = req.body;
    if (!bookingId) return res.status(400).json({ message: "Missing bookingId" });
    if (!memberId) return res.status(400).json({ message: "Missing memberId" });

    const memberBookings = await storage.getBookingsForMember(memberId);
    const booking = memberBookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const raw = await storage.getAppSetting("cancellation_window_minutes");
    const cancellationWindowMinutes = raw ? parseInt(raw, 10) : 60;
    const windowMins = Number.isNaN(cancellationWindowMinutes) ? 60 : cancellationWindowMinutes;
    const [h, m] = (booking.startTime || "00:00").split(":").map(Number);
    const classStart = new Date(booking.sessionDate + "T00:00:00");
    classStart.setHours(h, m, 0, 0);
    const cutoff = new Date(classStart.getTime() - windowMins * 60 * 1000);
    if (new Date() > cutoff) {
      return res.status(400).json({ message: "Cancellation window has passed" });
    }

    await storage.updateBookingStatus(bookingId, "CANCELLED");

    if (booking.status === "BOOKED") {
      const memberMemberships = await storage.getMemberMemberships(memberId);
      const membership = memberMemberships.find(m => m.category === booking.category);
      if (membership) {
        await storage.updateMembershipSessions(membership.id, membership.sessionsRemaining + 1);
      }

      const sessionBookings = await storage.getBookingsForSession(booking.scheduleId, booking.sessionDate);
      const waitlisted = sessionBookings
        .filter(b => b.status === "WAITLISTED")
        .sort((a, b) => (a.waitlistPosition || 999) - (b.waitlistPosition || 999));

      if (waitlisted.length > 0) {
        await storage.updateBookingStatus(waitlisted[0].id, "BOOKED", undefined);
        for (let i = 1; i < waitlisted.length; i++) {
          await storage.updateBookingStatus(waitlisted[i].id, "WAITLISTED", i);
        }
      }
    }

    if (booking.status === "WAITLISTED") {
      const sessionBookings = await storage.getBookingsForSession(booking.scheduleId, booking.sessionDate);
      const waitlisted = sessionBookings
        .filter(b => b.status === "WAITLISTED" && b.id !== bookingId)
        .sort((a, b) => (a.waitlistPosition || 999) - (b.waitlistPosition || 999));

      for (let i = 0; i < waitlisted.length; i++) {
        await storage.updateBookingStatus(waitlisted[i].id, "WAITLISTED", i + 1);
      }
    }

    const updatedBookings = await storage.getBookingsForMember(memberId);
    res.json({ bookings: updatedBookings.filter(b => b.status !== "CANCELLED") });
  }));

  // My sessions (upcoming + past)
  app.get("/api/my-sessions", asyncHandler(async (req: Request, res: Response) => {
    const phone = req.query.phone as string;
    if (!phone) return res.status(400).json({ message: "Missing phone" });
    const member = await storage.getMemberByPhone(phone);
    if (!member) return res.json({ upcoming: [], past: [] });
    const all = await storage.getBookingsForMember(member.id);
    const now = new Date();
    const upcoming: typeof all = [];
    const past: typeof all = [];
    for (const b of all) {
      if (b.status === "CANCELLED") continue;
      const dt = new Date(`${b.sessionDate}T${b.startTime}`);
      if (dt >= now) upcoming.push(b);
      else past.push(b);
    }
    upcoming.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime));
    past.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.startTime.localeCompare(a.startTime));
    res.json({ upcoming, past });
  }));
}
