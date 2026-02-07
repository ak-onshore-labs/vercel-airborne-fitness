import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, date, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull().default("New Member"),
  email: text("email"),
  dob: text("dob"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  medicalConditions: text("medical_conditions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const memberships = pgTable("memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  category: text("category").notNull(),
  planName: text("plan_name").notNull(),
  sessionsTotal: integer("sessions_total").notNull(),
  sessionsRemaining: integer("sessions_remaining").notNull(),
  price: integer("price").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classSchedule = pgTable("class_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: text("class_id").notNull(),
  category: text("category").notNull(),
  branch: text("branch").notNull().default("Lower Parel"),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun, 6=Sat
  startHour: integer("start_hour").notNull(),
  startMinute: integer("start_minute").notNull().default(0),
  endHour: integer("end_hour").notNull(),
  endMinute: integer("end_minute").notNull().default(0),
  capacity: integer("capacity").notNull().default(14),
  isActive: boolean("is_active").notNull().default(true),
});

export const bookingStatusEnum = pgEnum("booking_status", ["BOOKED", "WAITLISTED", "CANCELLED"]);

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  sessionDate: text("session_date").notNull(), // YYYY-MM-DD
  scheduleId: text("schedule_id").notNull(),
  category: text("category").notNull(),
  branch: text("branch").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("BOOKED"), // BOOKED | WAITLISTED | CANCELLED
  waitlistPosition: integer("waitlist_position"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const waiverSignatures = pgTable("waiver_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  signatureName: text("signature_name").notNull(),
  agreedTerms: boolean("agreed_terms").notNull().default(false),
  agreedAge: boolean("agreed_age").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kidDetails = pgTable("kid_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  kidName: text("kid_name").notNull(),
  kidDob: text("kid_dob").notNull(),
  kidGender: text("kid_gender").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertMemberSchema = createInsertSchema(members).omit({ id: true, createdAt: true });
export const insertMembershipSchema = createInsertSchema(memberships).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertClassScheduleSchema = createInsertSchema(classSchedule).omit({ id: true });
export const insertWaiverSchema = createInsertSchema(waiverSignatures).omit({ id: true, createdAt: true });
export const insertKidDetailsSchema = createInsertSchema(kidDetails).omit({ id: true, createdAt: true });

// Types
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type ClassScheduleItem = typeof classSchedule.$inferSelect;
export type InsertClassSchedule = z.infer<typeof insertClassScheduleSchema>;
export type BookingRecord = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type WaiverSignature = typeof waiverSignatures.$inferSelect;
export type InsertWaiver = z.infer<typeof insertWaiverSchema>;
export type KidDetail = typeof kidDetails.$inferSelect;
export type InsertKidDetail = z.infer<typeof insertKidDetailsSchema>;

// Keep legacy types for backward compat
export type User = Member;
export type InsertUser = InsertMember;
