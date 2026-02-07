import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { asyncHandler } from "./middleware";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // --- AUTH / LOGIN ---
  app.post("/api/login", asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ message: "Phone number required" });
    }

    let member = await storage.getMemberByPhone(phone);
    const isNew = !member;

    if (!member) {
      member = await storage.createMember({ phone, name: "New Member" });
    }

    const membershipList = await storage.getMemberMemberships(member.id);
    const membershipMap: Record<string, any> = {};
    for (const m of membershipList) {
      membershipMap[m.category] = {
        id: m.id,
        sessionsRemaining: m.sessionsRemaining,
        expiryDate: m.expiryDate,
        planName: m.planName,
      };
    }

    res.json({ member, memberships: membershipMap, isNew: isNew || membershipList.length === 0 });
  }));

  // --- MEMBER PROFILE UPDATE ---
  app.patch("/api/members/:id", asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await storage.updateMember(id, req.body);
    if (!updated) return res.status(404).json({ message: "Member not found" });
    res.json(updated);
  }));

  // --- ENROLLMENT ---
  app.post("/api/enroll", asyncHandler(async (req: Request, res: Response) => {
    const { memberId, personalDetails, plans, waiver, kidDetails: kidInfo } = req.body;
    if (!memberId || !plans || !Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ message: "Invalid enrollment data" });
    }

    // Update member personal details
    if (personalDetails) {
      await storage.updateMember(memberId, {
        name: personalDetails.name,
        email: personalDetails.email,
        dob: personalDetails.dob,
        emergencyContactName: personalDetails.emergencyContactName,
        emergencyContactPhone: personalDetails.emergencyContactPhone,
        medicalConditions: personalDetails.medicalConditions,
      });
    }

    // Create memberships
    const createdMemberships: any[] = [];
    for (const plan of plans) {
      const ms = await storage.createMembership({
        memberId,
        category: plan.category,
        planName: plan.planName,
        sessionsTotal: plan.sessions,
        sessionsRemaining: plan.sessions,
        price: plan.price,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * (plan.validityDays || 30)),
      });
      createdMemberships.push(ms);
    }

    // Save waiver
    if (waiver) {
      await storage.createWaiver({
        memberId,
        signatureName: waiver.signatureName,
        agreedTerms: waiver.agreedTerms,
        agreedAge: waiver.agreedAge,
      });
    }

    // Save kid details
    if (kidInfo && kidInfo.name) {
      await storage.createKidDetail({
        memberId,
        kidName: kidInfo.name,
        kidDob: kidInfo.dob,
        kidGender: kidInfo.gender,
      });
    }

    // Return updated membership map
    const allMemberships = await storage.getMemberMemberships(memberId);
    const membershipMap: Record<string, any> = {};
    for (const m of allMemberships) {
      membershipMap[m.category] = {
        id: m.id,
        sessionsRemaining: m.sessionsRemaining,
        expiryDate: m.expiryDate,
        planName: m.planName,
      };
    }

    res.json({ memberships: membershipMap });
  }));

  // --- SCHEDULE ---
  app.get("/api/schedule", asyncHandler(async (_req: Request, res: Response) => {
    const schedule = await storage.getSchedule();
    res.json(schedule);
  }));

  // --- BOOKINGS ---
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

  app.post("/api/book", asyncHandler(async (req: Request, res: Response) => {
    const { memberId, scheduleId, sessionDate, category, branch, startTime, endTime } = req.body;
    if (!memberId || !scheduleId || !sessionDate || !category || !branch) {
      return res.status(400).json({ message: "Missing booking data" });
    }

    // Check capacity
    const existingBookings = await storage.getBookingsForSession(scheduleId, sessionDate);
    const bookedCount = existingBookings.filter(b => b.status === "BOOKED").length;
    const capacity = 14;

    // Check if already booked
    const alreadyBooked = existingBookings.find(b => b.memberId === memberId && b.status !== "CANCELLED");
    if (alreadyBooked) {
      return res.status(409).json({ message: "Already booked or waitlisted", booking: alreadyBooked });
    }

    // Decrement membership sessions
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

  app.post("/api/cancel", asyncHandler(async (req: Request, res: Response) => {
    const { bookingId, memberId } = req.body;
    if (!bookingId) return res.status(400).json({ message: "Missing bookingId" });
    if (!memberId) return res.status(400).json({ message: "Missing memberId" });

    const memberBookings = await storage.getBookingsForMember(memberId);
    const booking = memberBookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    await storage.updateBookingStatus(bookingId, "CANCELLED");

    // If was BOOKED, refund session and promote waitlist
    if (booking.status === "BOOKED") {
      const memberMemberships = await storage.getMemberMemberships(memberId);
      const membership = memberMemberships.find(m => m.category === booking.category);
      if (membership) {
        await storage.updateMembershipSessions(membership.id, membership.sessionsRemaining + 1);
      }

      // Promote first waitlisted
      const sessionBookings = await storage.getBookingsForSession(booking.scheduleId, booking.sessionDate);
      const waitlisted = sessionBookings
        .filter(b => b.status === "WAITLISTED")
        .sort((a, b) => (a.waitlistPosition || 999) - (b.waitlistPosition || 999));

      if (waitlisted.length > 0) {
        await storage.updateBookingStatus(waitlisted[0].id, "BOOKED", undefined);
        // Recompute positions
        for (let i = 1; i < waitlisted.length; i++) {
          await storage.updateBookingStatus(waitlisted[i].id, "WAITLISTED", i);
        }
      }
    }

    // If was WAITLISTED, recompute positions
    if (booking.status === "WAITLISTED") {
      const sessionBookings = await storage.getBookingsForSession(booking.scheduleId, booking.sessionDate);
      const waitlisted = sessionBookings
        .filter(b => b.status === "WAITLISTED" && b.id !== bookingId)
        .sort((a, b) => (a.waitlistPosition || 999) - (b.waitlistPosition || 999));

      for (let i = 0; i < waitlisted.length; i++) {
        await storage.updateBookingStatus(waitlisted[i].id, "WAITLISTED", i + 1);
      }
    }

    // Return updated bookings
    const updatedBookings = await storage.getBookingsForMember(memberId);
    res.json({ bookings: updatedBookings.filter(b => b.status !== "CANCELLED") });
  }));

  // --- MEMBERSHIP PLANS (static data for frontend) ---
  app.get("/api/plans", (_req: Request, res: Response) => {
    res.json({
      "Aerial Fitness": [
        { id: "af-walkin", name: "Walk-in", sessions: 1, price: 1000, validityDays: 7 },
        { id: "af-4", name: "4 Sessions", sessions: 4, price: 3000, validityDays: 30 },
        { id: "af-8", name: "8 Sessions", sessions: 8, price: 5500, validityDays: 45 },
        { id: "af-24", name: "24 Sessions", sessions: 24, price: 15500, validityDays: 90 },
        { id: "af-48", name: "48 Sessions", sessions: 48, price: 30000, validityDays: 180 },
        { id: "af-96", name: "96 Sessions", sessions: 96, price: 58000, validityDays: 365 },
      ],
      "Pilates & Mobility": [
        { id: "pm-walkin", name: "Walk-in", sessions: 1, price: 1000, validityDays: 7 },
        { id: "pm-8", name: "8 Sessions", sessions: 8, price: 5000, validityDays: 45 },
        { id: "pm-12", name: "12 Sessions", sessions: 12, price: 7500, validityDays: 60 },
      ],
      "Kids Advance Aerial": [
        { id: "ka-walkin", name: "Walk-in", sessions: 1, price: 1000, validityDays: 7 },
        { id: "ka-8", name: "Monthly (8 Sessions)", sessions: 8, price: 7000, validityDays: 30 },
        { id: "ka-24", name: "3 Months (24 Sessions)", sessions: 24, price: 20000, validityDays: 90 },
      ],
      "Aerial Hoop & Silk": [
        { id: "ah-walkin", name: "Walk-in", sessions: 1, price: 1000, validityDays: 7 },
        { id: "ah-8", name: "8 Sessions", sessions: 8, price: 7000, validityDays: 30 },
        { id: "ah-24", name: "24 Sessions", sessions: 24, price: 20000, validityDays: 90 },
      ],
      "Kids Aerial Fitness": [
        { id: "kf-walkin", name: "Walk-in", sessions: 1, price: 1000, validityDays: 7 },
        { id: "kf-8", name: "8 Sessions", sessions: 8, price: 6000, validityDays: 30 },
        { id: "kf-24", name: "24 Sessions", sessions: 24, price: 17000, validityDays: 90 },
        { id: "kf-48", name: "48 Sessions", sessions: 48, price: 33000, validityDays: 180 },
        { id: "kf-96", name: "96 Sessions", sessions: 96, price: 64000, validityDays: 365 },
      ],
      "Functional Training": [
        { id: "ft-walkin", name: "Walk-in", sessions: 1, price: 1000, validityDays: 7 },
        { id: "ft-12", name: "12 Sessions", sessions: 12, price: 5000, validityDays: 45 },
        { id: "ft-36", name: "36 Sessions", sessions: 36, price: 13500, validityDays: 120 },
        { id: "ft-72", name: "72 Sessions", sessions: 72, price: 27000, validityDays: 240 },
        { id: "ft-144", name: "144 Sessions", sessions: 144, price: 50000, validityDays: 365 },
      ],
    });
  });

  // --- CLASS CATEGORIES (static) ---
  app.get("/api/categories", (_req: Request, res: Response) => {
    res.json([
      { id: "pilates", name: "Pilates & Mobility", ageGroup: "Adults" },
      { id: "aerial-fitness", name: "Aerial Fitness", ageGroup: "Adults" },
      { id: "aerial-hoop", name: "Aerial Hoop & Silk", ageGroup: "Adults" },
      { id: "functional", name: "Functional Training", ageGroup: "Adults" },
      { id: "kids-aerial", name: "Kids Aerial Fitness", ageGroup: "Kids 5-14" },
    ]);
  });

  return httpServer;
}
