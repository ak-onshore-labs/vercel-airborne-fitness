import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler, requireAuth } from "../middleware";
import { MembershipPlanModel } from "../models";

const MEMBER_BOOKING_CUTOFF_MINUTES = 5;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Session is bookable by members only until 5 minutes after start. Returns false if now > sessionStart + 5 min. */
function isWithinMemberBookingWindow(sessionDate: string, startHour: number, startMinute: number): boolean {
  const sessionStart = new Date(`${sessionDate}T${pad2(startHour)}:${pad2(startMinute)}:00`);
  const cutoffMs = sessionStart.getTime() + MEMBER_BOOKING_CUTOFF_MINUTES * 60 * 1000;
  return Date.now() <= cutoffMs;
}

/** Resolve category (class type name) for a slot */
async function getCategoryForSlot(scheduleId: string): Promise<string> {
  const slot = await storage.getScheduleSlot(scheduleId);
  return slot?.category ?? "";
}

/** Find a membership for this member that matches the slot's class type (via plan). Only considers active memberships (expiry in future, sessions remaining > 0). */
async function findMembershipForSlot(memberId: string, scheduleId: string): Promise<{ id: string; sessionsRemaining: number } | null> {
  const slot = await storage.getScheduleSlot(scheduleId);
  if (!slot) return null;
  const all = await storage.getMemberMemberships(memberId);
  const now = new Date();
  const memberships = all.filter(
    (m) => new Date(m.expiryDate) > now && m.sessionsRemaining >= 0
  );
  const plans = await MembershipPlanModel.find({ classTypeId: slot.classTypeId });
  const planIds = new Set(plans.map((p: any) => String(p._id)));
  const m = memberships.find(m => planIds.has(m.membershipPlanId));
  return m ? { id: m.id, sessionsRemaining: m.sessionsRemaining } : null;
}

export function registerManageSessionRoutes(app: Express): void {
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

  app.get(
    "/api/bookings/:memberId",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const { memberId } = req.params;
      const result = await storage.getBookingsForMember(memberId);
      const withSlot = await Promise.all(
        result.map(async (b) => {
          const slot = await storage.getScheduleSlot(b.scheduleId);
          return {
            ...b,
            category: slot?.category ?? "",
            branch: slot?.branch ?? "",
            startTime: slot ? `${pad2(slot.startHour)}:${pad2(slot.startMinute)}` : "",
            endTime: slot ? `${pad2(slot.endHour)}:${pad2(slot.endMinute)}` : "",
          };
        })
      );
      res.json(withSlot);
    })
  );

  app.get("/api/session-bookings", asyncHandler(async (req: Request, res: Response) => {
    const { scheduleId, date } = req.query;
    if (!scheduleId || !date) return res.status(400).json({ message: "Missing params" });
    const result = await storage.getBookingsForSession(scheduleId as string, date as string);
    const booked = result.filter(b => b.status === "BOOKED").length;
    const waitlistCount = result.filter(b => b.status === "WAITLIST").length;
    res.json({ bookedCount: booked, waitlistCount });
  }));

  app.post(
    "/api/join-waitlist",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const { memberId, scheduleId, sessionDate } = req.body;
      if (!memberId || !scheduleId || !sessionDate) {
        return res.status(400).json({ message: "Missing booking data" });
      }

      const slot = await storage.getScheduleSlot(scheduleId);
      if (!slot) return res.status(400).json({ message: "Invalid schedule slot" });

      if (!isWithinMemberBookingWindow(sessionDate, slot.startHour, slot.startMinute)) {
        return res.status(400).json({ message: "This session is no longer available for booking." });
      }

      const existingBookings = await storage.getBookingsForSession(scheduleId, sessionDate);
      const alreadyBooked = existingBookings.find(b => b.memberId === memberId && b.status !== "CANCELLED");
      if (alreadyBooked) {
        return res.status(409).json({ message: "Already on this session or waitlist", booking: alreadyBooked });
      }

      const membership = await findMembershipForSlot(memberId, scheduleId);
      if (!membership || membership.sessionsRemaining <= 0) {
        return res.status(400).json({ message: "No sessions remaining for this class" });
      }

      const waitlistBookings = existingBookings.filter(b => b.status === "WAITLIST").sort(
        (a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999)
      );
      const nextPosition = waitlistBookings.length === 0
        ? 1
        : Math.max(0, ...waitlistBookings.map(b => b.waitlistPosition ?? 0)) + 1;

      const booking = await storage.createBooking({
        memberId,
        scheduleId,
        sessionDate,
        status: "WAITLIST",
        waitlistPosition: nextPosition,
      });

      const pad2 = (n: number) => String(n).padStart(2, "0");
      res.json({
        ...booking,
        category: slot.category,
        branch: slot.branch,
        startTime: `${pad2(slot.startHour)}:${pad2(slot.startMinute)}`,
        endTime: `${pad2(slot.endHour)}:${pad2(slot.endMinute)}`,
      });
    })
  );

  app.post(
    "/api/book",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const { memberId, scheduleId, sessionDate } = req.body;
      if (!memberId || !scheduleId || !sessionDate) {
        return res.status(400).json({ message: "Missing booking data" });
      }

      const slot = await storage.getScheduleSlot(scheduleId);
      if (!slot) return res.status(400).json({ message: "Invalid schedule slot" });

      if (!isWithinMemberBookingWindow(sessionDate, slot.startHour, slot.startMinute)) {
        return res.status(400).json({ message: "This session is no longer available for booking." });
      }

      const capacity = slot.capacity;
      const existingBookings = await storage.getBookingsForSession(scheduleId, sessionDate);
      const bookedCount = existingBookings.filter(b => b.status === "BOOKED").length;

      const alreadyBooked = existingBookings.find(b => b.memberId === memberId && b.status !== "CANCELLED");
      if (alreadyBooked) {
        return res.status(409).json({ message: "Already booked", booking: alreadyBooked });
      }

      const membership = await findMembershipForSlot(memberId, scheduleId);
      if (!membership || membership.sessionsRemaining <= 0) {
        return res.status(400).json({ message: "No sessions remaining for this class" });
      }

      if (bookedCount >= capacity) {
        return res.status(400).json({ message: "Session is full" });
      }

      await storage.incrementMembershipSessions(membership.id, -1);

      const booking = await storage.createBooking({
        memberId,
        scheduleId,
        sessionDate,
        status: "BOOKED",
      });

      res.json({
        ...booking,
        category: slot.category,
        branch: slot.branch,
        startTime: `${pad2(slot.startHour)}:${pad2(slot.startMinute)}`,
        endTime: `${pad2(slot.endHour)}:${pad2(slot.endMinute)}`,
      });
    })
  );

  app.post(
    "/api/cancel",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const auth = req.auth!;
      const { bookingId, memberId } = req.body;
      if (!bookingId) return res.status(400).json({ message: "Missing bookingId" });
      if (!memberId) return res.status(400).json({ message: "Missing memberId" });

      const requester = await storage.getUser(auth.userId);
      if (!requester) return res.status(403).json({ message: "User not found" });

      const isAdminOrStaff = requester.userRole === "ADMIN" || requester.userRole === "STAFF";

      const member = await storage.getMember(memberId);
      if (!member) return res.status(404).json({ message: "Member not found" });
      if (!isAdminOrStaff && member.userId !== auth.userId) {
        return res.status(403).json({ message: "Not allowed to cancel this booking" });
      }

      const memberBookings = await storage.getBookingsForMember(memberId);
      const booking = memberBookings.find(b => b.id === bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      const slot = await storage.getScheduleSlot(booking.scheduleId);
      if (!slot) return res.status(400).json({ message: "Schedule slot not found" });

      const raw = await storage.getAppSetting("cancellation_window_minutes");
      const cancellationWindowMinutes = raw ? parseInt(raw, 10) : 60;
      const windowMins = Number.isNaN(cancellationWindowMinutes) ? 60 : cancellationWindowMinutes;
      const classStart = new Date(`${booking.sessionDate}T${pad2(slot.startHour)}:${pad2(slot.startMinute)}:00`);
      const cutoff = new Date(classStart.getTime() - windowMins * 60 * 1000);
      if (new Date() > cutoff) {
        return res.status(400).json({ message: "Cancellation window has passed" });
      }

      await storage.updateBookingStatus(bookingId, "CANCELLED");
      if (booking.status === "BOOKED") {
        const membership = await findMembershipForSlot(memberId, booking.scheduleId);
        if (membership) {
          await storage.incrementMembershipSessions(membership.id, 1);
        }

        const sessionBookings = await storage.getBookingsForSession(booking.scheduleId, booking.sessionDate);
        const waitlist = sessionBookings
          .filter(b => b.status === "WAITLIST")
          .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
        if (waitlist.length > 0) {
          const first = waitlist[0];
          const firstMembership = await findMembershipForSlot(first.memberId, booking.scheduleId);
          if (firstMembership && firstMembership.sessionsRemaining > 0) {
            await storage.updateBookingStatus(first.id, "BOOKED", null);
            await storage.incrementMembershipSessions(firstMembership.id, -1);
            const remaining = waitlist.slice(1);
            for (let i = 0; i < remaining.length; i++) {
              await storage.updateBookingStatus(remaining[i].id, "WAITLIST", i + 1);
            }
          }
        }
      } else if (booking.status === "WAITLIST") {
        const sessionBookings = await storage.getBookingsForSession(booking.scheduleId, booking.sessionDate);
        const waitlist = sessionBookings
          .filter(b => b.status === "WAITLIST")
          .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
        for (let i = 0; i < waitlist.length; i++) {
          await storage.updateBookingStatus(waitlist[i].id, "WAITLIST", i + 1);
        }
      }

      const updatedBookings = await storage.getBookingsForMember(memberId);
      res.json({ bookings: updatedBookings.filter(b => b.status !== "CANCELLED") });
    })
  );

  app.get(
    "/api/my-sessions",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const auth = req.auth!;
      const members = await storage.getMembersByUserId(auth.userId);
      const memberIds = members.map(m => m.id);
      const all: Awaited<ReturnType<typeof storage.getBookingsForMember>> = [];
      for (const id of memberIds) {
        const list = await storage.getBookingsForMember(id);
        all.push(...list);
      }
      const nowMs = Date.now();
      const upcoming: typeof all = [];
      const past: typeof all = [];
      for (const b of all) {
        if (b.status === "CANCELLED") continue;
        const slot = await storage.getScheduleSlot(b.scheduleId);
        const startTime = slot ? `${pad2(slot.startHour)}:${pad2(slot.startMinute)}` : "00:00";
        const sessionStart = new Date(`${b.sessionDate}T${startTime}`);
        const cutoffMs = sessionStart.getTime() + MEMBER_BOOKING_CUTOFF_MINUTES * 60 * 1000;
        const enriched = { ...b, startTime, endTime: slot ? `${pad2(slot.endHour)}:${pad2(slot.endMinute)}` : "", category: slot?.category ?? "", branch: slot?.branch ?? "" };
        if (nowMs <= cutoffMs) upcoming.push(enriched as any);
        else past.push(enriched as any);
      }
      upcoming.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || (a as any).startTime.localeCompare((b as any).startTime));
      past.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || (b as any).startTime.localeCompare((a as any).startTime));
      res.json({ upcoming, past });
    })
  );
}
