import { db } from "./db";
import { 
  members, memberships, classSchedule, bookings, waiverSignatures, kidDetails,
  type Member, type InsertMember, 
  type Membership, type InsertMembership,
  type ClassScheduleItem, type InsertClassSchedule,
  type BookingRecord, type InsertBooking,
  type InsertWaiver, type InsertKidDetail
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  getMemberByPhone(phone: string): Promise<Member | undefined>;
  getMember(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, data: Partial<InsertMember>): Promise<Member | undefined>;

  getMemberMemberships(memberId: string): Promise<Membership[]>;
  createMembership(membership: InsertMembership): Promise<Membership>;
  updateMembershipSessions(id: string, sessionsRemaining: number): Promise<void>;

  getSchedule(): Promise<ClassScheduleItem[]>;
  createScheduleItem(item: InsertClassSchedule): Promise<ClassScheduleItem>;

  getBookingsForMember(memberId: string): Promise<BookingRecord[]>;
  getBookingsForSession(scheduleId: string, sessionDate: string): Promise<BookingRecord[]>;
  createBooking(booking: InsertBooking): Promise<BookingRecord>;
  updateBookingStatus(id: string, status: string, waitlistPosition?: number): Promise<void>;

  createWaiver(waiver: InsertWaiver): Promise<void>;
  createKidDetail(detail: InsertKidDetail): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getMemberByPhone(phone: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.phone, phone));
    return member;
  }

  async getMember(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async createMember(member: InsertMember): Promise<Member> {
    const [created] = await db.insert(members).values(member).returning();
    return created;
  }

  async updateMember(id: string, data: Partial<InsertMember>): Promise<Member | undefined> {
    const [updated] = await db.update(members).set(data).where(eq(members.id, id)).returning();
    return updated;
  }

  async getMemberMemberships(memberId: string): Promise<Membership[]> {
    return db.select().from(memberships).where(eq(memberships.memberId, memberId));
  }

  async createMembership(membership: InsertMembership): Promise<Membership> {
    const [created] = await db.insert(memberships).values(membership).returning();
    return created;
  }

  async updateMembershipSessions(id: string, sessionsRemaining: number): Promise<void> {
    await db.update(memberships).set({ sessionsRemaining }).where(eq(memberships.id, id));
  }

  async getSchedule(): Promise<ClassScheduleItem[]> {
    return db.select().from(classSchedule).where(eq(classSchedule.isActive, true));
  }

  async createScheduleItem(item: InsertClassSchedule): Promise<ClassScheduleItem> {
    const [created] = await db.insert(classSchedule).values(item).returning();
    return created;
  }

  async getBookingsForMember(memberId: string): Promise<BookingRecord[]> {
    return db.select().from(bookings).where(eq(bookings.memberId, memberId)).orderBy(asc(bookings.sessionDate));
  }

  async getBookingsForSession(scheduleId: string, sessionDate: string): Promise<BookingRecord[]> {
    return db.select().from(bookings)
      .where(and(eq(bookings.scheduleId, scheduleId), eq(bookings.sessionDate, sessionDate)));
  }

  async createBooking(booking: InsertBooking): Promise<BookingRecord> {
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  }

  async updateBookingStatus(id: string, status: string, waitlistPosition?: number): Promise<void> {
    const data: any = { status };
    if (waitlistPosition !== undefined) data.waitlistPosition = waitlistPosition;
    await db.update(bookings).set(data).where(eq(bookings.id, id));
  }

  async createWaiver(waiver: InsertWaiver): Promise<void> {
    await db.insert(waiverSignatures).values(waiver);
  }

  async createKidDetail(detail: InsertKidDetail): Promise<void> {
    await db.insert(kidDetails).values(detail);
  }
}

export const storage = new DatabaseStorage();
