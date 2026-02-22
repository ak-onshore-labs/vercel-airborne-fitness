/**
 * Shared TypeScript types for Airborne Fitness.
 * DB-agnostic: used by client and server; persistence uses MongoDB (Mongoose) on server.
 */

// ----- Document types (match MongoDB/Mongoose shape; id is string from _id) -----

export interface Member {
  id: string;
  phone: string;
  name: string;
  email?: string | null;
  dob?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalConditions?: string | null;
  createdAt?: Date | null;
}

export interface ClassType {
  id: string;
  name: string;
  ageGroup: string;
  strengthLevel: number;
  infoBullets: string[];
  isActive: boolean;
}

export interface MembershipPlan {
  id: string;
  classTypeId: string;
  name: string;
  sessionsTotal: number;
  validityDays: number;
  price: number;
  isActive: boolean;
}

export interface ScheduleSlot {
  id: string;
  classTypeId: string;
  branch: string;
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  capacity: number;
  isActive: boolean;
  notes?: string | null;
}

export interface Membership {
  id: string;
  memberId: string;
  category: string;
  planName: string;
  sessionsTotal: number;
  sessionsRemaining: number;
  price: number;
  expiryDate: Date;
  extensionRequestedAt?: Date | null;
  extensionApprovedAt?: Date | null;
  extensionApplied: boolean;
  createdAt?: Date | null;
}

export type BookingStatus = "BOOKED" | "WAITLISTED" | "CANCELLED";

export interface BookingRecord {
  id: string;
  memberId: string;
  sessionDate: string;
  scheduleId: string;
  category: string;
  branch: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  waitlistPosition?: number | null;
  createdAt?: Date | null;
}

export interface WaiverSignature {
  id: string;
  memberId: string;
  signatureName: string;
  agreedTerms: boolean;
  agreedAge: boolean;
  createdAt?: Date | null;
}

export interface KidDetail {
  id: string;
  memberId: string;
  kidName: string;
  kidDob: string;
  kidGender: string;
  createdAt?: Date | null;
}

export interface AppSetting {
  key: string;
  value: string;
}

// ----- Insert / update types (omit id, optional timestamps) -----

export type InsertMember = Omit<Member, "id" | "createdAt"> & { createdAt?: Date };
export type InsertMembership = Omit<Membership, "id" | "createdAt"> & { createdAt?: Date };
export type InsertBooking = Omit<BookingRecord, "id" | "createdAt"> & { createdAt?: Date };
export type InsertClassType = Omit<ClassType, "id">;
export type InsertMembershipPlan = Omit<MembershipPlan, "id">;
export type InsertScheduleSlot = Omit<ScheduleSlot, "id">;
export type InsertWaiver = Omit<WaiverSignature, "id" | "createdAt"> & { createdAt?: Date };
export type InsertKidDetail = Omit<KidDetail, "id" | "createdAt"> & { createdAt?: Date };

// Legacy aliases
export type User = Member;
export type InsertUser = InsertMember;
