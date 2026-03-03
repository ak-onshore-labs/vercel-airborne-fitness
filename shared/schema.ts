/**
 * Shared TypeScript types for Airborne Fitness.
 * DB-agnostic: used by client and server; persistence uses MongoDB (Mongoose) on server.
 */

// ----- Document types (match MongoDB/Mongoose shape; id is string from _id) -----

export type UserRole = "ADMIN" | "STAFF" | "MEMBER";

/** User: login identity (name, mobile, gender, role). One user can have multiple members (e.g. Adult + Kid). */
export interface User {
  id: string;
  name: string;
  mobile: string;
  gender: string;
  userRole: UserRole;
  createdAt?: Date | null;
}

export type MemberType = "Kid" | "Adult";

/** Member: profile per user; type Kid or Adult. Kid-specific fields only when memberType is Kid. */
export interface Member {
  id: string;
  userId: string;
  memberType: MemberType;
  /** For Kid: kid's name. For Adult: can use User.name */
  name?: string | null;
  /** For Kid: kid's DOB */
  dob?: string | null;
  /** For Kid: kid's gender */
  gender?: string | null;
  email?: string | null;
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

/** Membership: links Member to a MembershipPlan; has sessionsRemaining, expiry, carryForward. */
export interface Membership {
  id: string;
  memberId: string;
  membershipPlanId: string;
  sessionsRemaining: number;
  expiryDate: Date;
  carryForward: number;
  extensionRequestedAt?: Date | null;
  extensionApprovedAt?: Date | null;
  extensionApplied: boolean;
  createdAt?: Date | null;
}

export type BookingStatus = "BOOKED" | "CANCELLED" | "ATTENDED" | "ABSENT";

/** Booking: member + schedule occurrence (sessionDate) + status. category/branch/times derived from slot. */
export interface BookingRecord {
  id: string;
  memberId: string;
  scheduleId: string;
  sessionDate: string;
  status: BookingStatus;
  waitlistPosition?: number | null;
  createdAt?: Date | null;
}

/** Waiver signed by User (account holder), not per member. */
export interface WaiverSignature {
  id: string;
  userId: string;
  signatureName: string;
  agreedTerms: boolean;
  agreedAge: boolean;
  createdAt?: Date | null;
}

export interface AppSetting {
  key: string;
  value: string;
}

// ----- Insert / update types -----

export type InsertUser = Omit<User, "id" | "createdAt"> & { createdAt?: Date };
export type InsertMember = Omit<Member, "id" | "createdAt"> & { createdAt?: Date };
export type InsertMembership = Omit<Membership, "id" | "createdAt"> & { createdAt?: Date };
export type InsertBooking = Omit<BookingRecord, "id" | "createdAt"> & { createdAt?: Date };
export type InsertClassType = Omit<ClassType, "id">;
export type InsertMembershipPlan = Omit<MembershipPlan, "id">;
export type InsertScheduleSlot = Omit<ScheduleSlot, "id">;
export type InsertWaiver = Omit<WaiverSignature, "id" | "createdAt"> & { createdAt?: Date };
