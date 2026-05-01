/**
 * Shared TypeScript types for Airborne Fitness.
 * DB-agnostic: used by client and server; persistence uses MongoDB (Mongoose) on server.
 */

// ----- Document types (match MongoDB/Mongoose shape; id is string from _id) -----

export type UserRole = "ADMIN" | "STAFF" | "MEMBER";
export type GenderValue = "Male" | "Female" | "Other" | "Prefer not to say";

/** User: login identity (name, mobile, gender, role). One user can have multiple members (e.g. Adult + Kid). */
export interface User {
  id: string;
  name: string;
  mobile: string;
  gender: GenderValue | "";
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
  gender?: GenderValue | null;
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
  gstInclusive: boolean;
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
  genderRestriction: ScheduleGenderRestriction;
  notes?: string | null;
}

export type ScheduleGenderRestriction = "NONE" | "FEMALE_ONLY";

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
  pauseUsed: boolean;
  pauseStart?: Date | null;
  pauseEnd?: Date | null;
  /** Calendar start of membership (IST). Omitted/null = legacy / effective immediate start. */
  startDate?: Date | null;
  createdAt?: Date | null;
}

export type BookingStatus = "BOOKED" | "CANCELLED" | "ATTENDED" | "ABSENT" | "WAITLIST";

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

export type TransactionStatus = "CREATED" | "PENDING" | "SUCCESS" | "FAILED";

export interface Transaction {
  id: string;
  orderId: string;
  paymentId?: string | null;
  signature?: string | null;
  userId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  receipt: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
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
export type InsertTransaction = Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { createdAt?: Date; updatedAt?: Date };

// ----- Admin dashboard (operational metrics) -----

/** One session row for capacity insights (full / almost full today). */
export interface DashboardSessionRow {
  scheduleId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  category: string;
  branch: string;
  bookingCount: number;
  capacity: number;
}

/** One class type with booking count for "most booked" (last 30 days). */
export interface DashboardClassTypeRank {
  classTypeName: string;
  bookingCount: number;
}

/** One recent membership (enrollment) for dashboard. */
export interface DashboardRecentEnrollment {
  id: string;
  memberName: string;
  planName: string;
  classTypeName?: string;
  createdAt: string;
}

/** Per-branch today stats. */
export interface DashboardBranchStats {
  branch: string;
  bookingCount: number;
  occupancyRatePercent: number;
}

/** One membership row for lifecycle drill-down (expiring / expired). */
export interface DashboardMembershipRow {
  id: string;
  memberId: string;
  memberName: string;
  planName: string;
  classTypeName: string;
  expiryDate: string;
  sessionsRemaining: number;
  memberMobile?: string;
}

export interface DashboardStats {
  activeMembersCount: number;
  membershipsExpiringIn7Days: number;
  membershipsExpiringIn30Days: number;
  membershipsExpiredInLast7Days: number;
  membershipsExpiredInLast30Days: number;
  membershipsExpiringNext7Days: DashboardMembershipRow[];
  membershipsExpiringNext30Days: DashboardMembershipRow[];
  membershipsExpiredLast7Days: DashboardMembershipRow[];
  membershipsExpiredLast30Days: DashboardMembershipRow[];
  todayBookingsCount: number;
  todayOccupancyRatePercent: number;
  classesFullToday: DashboardSessionRow[];
  classesAlmostFullToday: DashboardSessionRow[];
  waitlistCountTodayAndUpcoming: number;
  mostBookedClassTypesLast30Days: DashboardClassTypeRank[];
  recentEnrollments: DashboardRecentEnrollment[];
  branchWiseBookingsAndOccupancy: DashboardBranchStats[];
}
