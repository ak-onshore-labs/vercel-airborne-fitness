import type {
  User,
  InsertUser,
  Member,
  InsertMember,
  Membership,
  InsertMembership,
  ScheduleSlot,
  InsertScheduleSlot,
  BookingRecord,
  InsertBooking,
  InsertWaiver,
  ClassType,
  InsertClassType,
  MembershipPlan,
  InsertMembershipPlan,
  Transaction,
  InsertTransaction,
  DashboardStats,
  DashboardSessionRow,
  DashboardClassTypeRank,
  DashboardRecentEnrollment,
  DashboardBranchStats,
  DashboardMembershipRow,
} from "@shared/schema";
import {
  UserModel,
  MemberModel,
  ClassTypeModel,
  MembershipPlanModel,
  ScheduleSlotModel,
  MembershipModel,
  BookingModel,
  WaiverSignatureModel,
  AppSettingModel,
  TransactionModel,
} from "./models";
import mongoose from "mongoose";
import type { Document } from "mongoose";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function toApi<T>(doc: Document | null): T | null {
  if (!doc) return null;
  const obj = doc.toObject() as Record<string, unknown>;
  const { _id, ...rest } = obj;
  return { ...rest, id: String(_id) } as T;
}

function toApiList<T>(docs: Document[]): T[] {
  return docs.map((d) => toApi<T>(d)!).filter(Boolean);
}

export interface ScheduleSlotWithCategory extends ScheduleSlot {
  category: string;
  classId: string;
}

export interface AdminTransactionsFilters {
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  paymentMode?: string;
}

export interface AdminTransactionRow {
  id: string;
  date: string;
  memberName: string;
  memberMobile: string;
  plan: string;
  classType: string;
  paymentMode: string;
  subtotal: string;
  gst: string;
  totalAmount: string;
  reference: string;
  source: string;
}

export interface AdminMembershipRow {
  id: string;
  memberName: string;
  memberMobile: string;
  planName: string;
  classTypeName: string;
  sessionsRemaining: string;
  startDate: string;
  expiryDate: string;
  extension: string;
}

interface AdminBookingsFilters {
  sessionDate?: string;
  dateFrom?: string;
  dateTo?: string;
  memberMobile?: string;
  memberName?: string;
  scheduleId?: string;
  classTypeName?: string;
  branch?: string;
}

export interface AdminBookingRow {
  id: string;
  date: string;
  time: string;
  memberName: string;
  memberMobile: string;
  classTypeName: string;
  branch: string;
  status: string;
}

export interface UpcomingScheduleSlotBookingPreviewItem {
  bookingId: string;
  memberId: string;
  memberName: string;
  memberMobile: string;
  sessionDate: string;
  status: "BOOKED" | "WAITLIST";
  waitlistPosition?: number | null;
}

export interface UpcomingScheduleSlotBookingPreview {
  items: UpcomingScheduleSlotBookingPreviewItem[];
  summary: {
    confirmedCount: number;
    waitlistCount: number;
    totalUpcomingAffected: number;
    displayedCount: number;
    remainingCount: number;
  };
}

export interface IStorage {
  getUserByMobile(mobile: string): Promise<User | undefined>;
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  /** Hard-delete member app account data for userId. Does not remove Transaction rows (v1). Idempotent if user already absent. */
  deleteAccountByUserId(userId: string): Promise<void>;

  getMembersByUserId(userId: string): Promise<Member[]>;
  getMember(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, data: Partial<InsertMember>): Promise<Member | undefined>;

  getMemberMemberships(memberId: string): Promise<Membership[]>;
  getMembershipById(id: string): Promise<Membership | undefined>;
  createMembership(membership: InsertMembership): Promise<Membership>;
  updateMembership(id: string, data: Partial<InsertMembership>): Promise<Membership | undefined>;
  updateMembershipSessions(id: string, sessionsRemaining: number): Promise<void>;
  incrementMembershipSessions(id: string, delta: number): Promise<void>;
  decrementMembershipSessionsIfPositive(id: string): Promise<boolean>;

  getClassTypes(): Promise<Array<{ id: string; name: string; ageGroup: string; strengthLevel: number; infoBullets: string[]; isActive: boolean }>>;
  createClassType(item: InsertClassType): Promise<ClassType>;
  getMembershipPlansGroupedByClassType(): Promise<Record<string, Array<{ id: string; name: string; sessions: number; price: number; validityDays: number }>>>;
  getMembershipPlansByClassType(classTypeId: string): Promise<Array<{ id: string; name: string; sessions: number; price: number; validityDays: number }>>;
  createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan>;
  getSchedule(): Promise<ScheduleSlotWithCategory[]>;
  getScheduleForBranchAndDate(branch: string, date: string): Promise<Array<{ scheduleId: string; sessionDate: string; classId: string; category: string; branch: string; startTime: string; endTime: string; capacity: number; genderRestriction: "NONE" | "FEMALE_ONLY" }>>;
  getScheduleSlot(id: string): Promise<ScheduleSlotWithCategory | undefined>;
  createScheduleSlot(item: InsertScheduleSlot): Promise<ScheduleSlot>;
  findOverlappingScheduleSlots(params: {
    classTypeId: string;
    branch: string;
    dayOfWeek: number;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    excludeId?: string;
  }): Promise<ScheduleSlot[]>;
  updateClassType(id: string, data: Partial<Pick<ClassType, "name" | "ageGroup" | "strengthLevel" | "infoBullets" | "isActive">>): Promise<ClassType | undefined>;
  updateMembershipPlan(id: string, data: Partial<Pick<MembershipPlan, "name" | "sessionsTotal" | "validityDays" | "price" | "isActive">>): Promise<MembershipPlan | undefined>;
  updateScheduleSlot(id: string, data: Partial<Pick<ScheduleSlot, "branch" | "dayOfWeek" | "startHour" | "startMinute" | "endHour" | "endMinute" | "capacity" | "isActive" | "genderRestriction" | "notes">>): Promise<ScheduleSlot | undefined>;

  getBookingsForMember(memberId: string): Promise<BookingRecord[]>;
  getBookingsForSession(scheduleId: string, sessionDate: string): Promise<BookingRecord[]>;
  getUpcomingBookingsPreviewForScheduleSlot(
    scheduleId: string,
    fromDate: string,
    limit?: number
  ): Promise<UpcomingScheduleSlotBookingPreview>;
  getUpcomingSessionsByBranch(
    branch: string,
    fromDate: string,
    days: number
  ): Promise<Array<{ date: string; sessions: Array<{ scheduleId: string; sessionDate: string; startTime: string; endTime: string; category: string; bookingCount: number; capacity: number }> }>>;
  getBranches(): Promise<string[]>;
  createBooking(booking: InsertBooking): Promise<BookingRecord>;
  updateBookingStatus(id: string, status: string, waitlistPosition?: number | null): Promise<void>;
  getBooking(id: string): Promise<BookingRecord | undefined>;

  createWaiver(waiver: InsertWaiver): Promise<void>;

  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionById(id: string): Promise<Transaction | undefined>;
  updateTransaction(id: string, data: Partial<Pick<Transaction, "status" | "paymentId" | "signature">>): Promise<Transaction | undefined>;
  getTransactionByOrderId(orderId: string): Promise<Transaction | undefined>;
  listTransactionsForUser(userId: string, opts: { limit: number }): Promise<Transaction[]>;
  listAdminTransactions(params: {
    page: number;
    limit: number;
    filters: AdminTransactionsFilters;
  }): Promise<{ items: AdminTransactionRow[]; total: number }>;
  listAdminTransactionsForExport(filters: AdminTransactionsFilters): Promise<AdminTransactionRow[]>;

  getAppSetting(key: string): Promise<string | null>;
  setAppSetting(key: string, value: string): Promise<void>;

  listUsers(params: { page: number; limit: number; name?: string }): Promise<{ items: User[]; total: number }>;
  listScheduleSlots(params: {
    page: number;
    limit: number;
    classTypeName?: string;
    branch?: string;
    dayOfWeek?: number;
    startTime?: string;
  }): Promise<{ items: (ScheduleSlotWithCategory & { startTime: string; endTime: string })[]; total: number }>;
  listClassTypes(params: { page: number; limit: number }): Promise<{ items: ClassType[]; total: number }>;
  listMembershipPlans(params: {
    page: number;
    limit: number;
    classTypeName?: string;
    planName?: string;
  }): Promise<{ items: (MembershipPlan & { classTypeName: string })[]; total: number }>;
  listMembers(params: {
    page: number;
    limit: number;
    phone?: string;
    name?: string;
    email?: string;
  }): Promise<{ items: (Member & { mobile?: string })[]; total: number }>;
  listMemberships(params: {
    page: number;
    limit: number;
    memberName?: string;
    memberMobile?: string;
    classTypeName?: string;
    startDateFrom?: string;
    startDateTo?: string;
    expiryDateFrom?: string;
    expiryDateTo?: string;
  }): Promise<{
    items: (Membership & { memberName?: string; memberMobile?: string; planName?: string; classTypeName?: string })[];
    total: number;
  }>;
  listMembershipsForExport(filters: {
    memberName?: string;
    memberMobile?: string;
    classTypeName?: string;
    startDateFrom?: string;
    startDateTo?: string;
    expiryDateFrom?: string;
    expiryDateTo?: string;
  }): Promise<AdminMembershipRow[]>;
  listBookings(params: {
    page: number;
    limit: number;
    sessionDate?: string;
    dateFrom?: string;
    dateTo?: string;
    memberMobile?: string;
    memberName?: string;
    scheduleId?: string;
    classTypeName?: string;
    branch?: string;
  }): Promise<{
    items: (BookingRecord & { memberMobile?: string; memberName?: string; classTypeName?: string; startTime?: string; endTime?: string; branch?: string })[];
    total: number;
  }>;
  listBookingsForExport(filters: AdminBookingsFilters): Promise<AdminBookingRow[]>;
  getDashboardStats(): Promise<DashboardStats>;
}

/** Occupancy fraction (0–1) above which a class is considered "almost full" for dashboard. */
export const ALMOST_FULL_OCCUPANCY_THRESHOLD = 0.8;

export class MongoStorage implements IStorage {
  private amountPaiseToInrString(amountPaise: number): string {
    const inr = Number.isFinite(amountPaise) ? amountPaise / 100 : 0;
    return inr.toFixed(2);
  }

  private normalizeDayStartUtc(day: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.trim())) return null;
    return new Date(`${day.trim()}T00:00:00.000Z`);
  }

  private normalizeDayEndUtc(day: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.trim())) return null;
    return new Date(`${day.trim()}T23:59:59.999Z`);
  }

  private pickReference(tx: Transaction): string {
    const paymentId = tx.paymentId?.trim();
    if (paymentId) return paymentId;
    const receipt = tx.receipt?.trim();
    if (receipt) return receipt;
    return tx.orderId?.trim() || "—";
  }

  private detectRazorpay(tx: Transaction): boolean {
    return tx.orderId.startsWith("order_") || !!(tx.paymentId && tx.paymentId.startsWith("pay_"));
  }

  private async buildAdminTransactionRows(filters: AdminTransactionsFilters): Promise<AdminTransactionRow[]> {
    const txFilter: Record<string, unknown> = { status: "SUCCESS" };
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom?.trim()) {
      const from = this.normalizeDayStartUtc(filters.dateFrom);
      if (from) createdAt.$gte = from;
    }
    if (filters.dateTo?.trim()) {
      const to = this.normalizeDayEndUtc(filters.dateTo);
      if (to) createdAt.$lte = to;
    }
    if (Object.keys(createdAt).length > 0) txFilter.createdAt = createdAt;

    const txDocs = await TransactionModel.find(txFilter).sort({ createdAt: -1 }).lean();
    if (txDocs.length === 0) return [];

    const transactions = txDocs.map((d) => {
      const obj = d as any;
      const id = String(obj._id);
      const row = { ...obj, id };
      delete (row as any)._id;
      return row as Transaction;
    });

    const userIds = Array.from(new Set(transactions.map((t) => t.userId))).filter(
      (id): id is string => Boolean(id) && mongoose.Types.ObjectId.isValid(id)
    );
    const users = await UserModel.find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
    const userMobileMap: Record<string, string> = {};
    for (const u of users as any[]) {
      const id = u._id.toString();
      userMobileMap[id] = u.mobile ?? "";
    }

    const memberIdSet = new Set<string>();
    const planIdSet = new Set<string>();
    const classTypeIdSet = new Set<string>();
    for (const t of transactions) {
      const md = (t.metadata ?? {}) as Record<string, unknown>;
      if (typeof md.memberId === "string" && md.memberId.trim()) memberIdSet.add(md.memberId.trim());
      if (typeof md.membershipPlanId === "string" && md.membershipPlanId.trim()) planIdSet.add(md.membershipPlanId.trim());
      if (typeof md.classTypeId === "string" && md.classTypeId.trim()) classTypeIdSet.add(md.classTypeId.trim());
    }

    const memberIds = Array.from(memberIdSet).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const planIds = Array.from(planIdSet).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const classTypeIds = Array.from(classTypeIdSet).filter((id) => mongoose.Types.ObjectId.isValid(id));

    const [members, plans, classTypes] = await Promise.all([
      memberIds.length > 0
        ? MemberModel.find({ _id: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
        : Promise.resolve([]),
      planIds.length > 0
        ? MembershipPlanModel.find({ _id: { $in: planIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
        : Promise.resolve([]),
      classTypeIds.length > 0
        ? ClassTypeModel.find({ _id: { $in: classTypeIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
        : Promise.resolve([]),
    ]);

    const memberMap: Record<string, { name: string; userId: string }> = {};
    for (const m of members as any[]) {
      const id = m._id.toString();
      memberMap[id] = { name: m.name ?? "", userId: m.userId };
    }
    const planMap: Record<string, { name: string; classTypeId: string }> = {};
    for (const p of plans as any[]) {
      planMap[p._id.toString()] = { name: p.name ?? "", classTypeId: p.classTypeId };
      if (p.classTypeId) classTypeIdSet.add(p.classTypeId);
    }
    const classTypeMap: Record<string, string> = {};
    for (const c of classTypes as any[]) {
      classTypeMap[c._id.toString()] = c.name ?? "";
    }

    const rows: AdminTransactionRow[] = transactions.map((t) => {
      const md = (t.metadata ?? {}) as Record<string, unknown>;
      const memberId = typeof md.memberId === "string" ? md.memberId.trim() : "";
      const planId = typeof md.membershipPlanId === "string" ? md.membershipPlanId.trim() : "";
      const explicitClassTypeId = typeof md.classTypeId === "string" ? md.classTypeId.trim() : "";

      const memberFromMetadata = memberId ? memberMap[memberId] : undefined;
      const userId = t.userId;
      const userMobile = userMobileMap[userId] || "";

      const memberName = memberFromMetadata?.name?.trim()
        ? memberFromMetadata.name.trim()
        : memberFromMetadata
          ? "—"
          : "—";
      const memberMobile = userMobile || "—";

      const planFromMetadata = typeof md.planName === "string" && md.planName.trim() ? md.planName.trim() : "";
      const planLookup = planId ? planMap[planId]?.name ?? "" : "";
      const plan = planFromMetadata || planLookup || "—";

      const classTypeFromExplicit = explicitClassTypeId ? classTypeMap[explicitClassTypeId] ?? "" : "";
      const classTypeFromPlan = planId ? classTypeMap[planMap[planId]?.classTypeId ?? ""] ?? "" : "";
      const classType = classTypeFromExplicit || classTypeFromPlan || "—";

      const metadataMode = typeof md.mode === "string" && md.mode.trim() ? md.mode.trim() : "";
      const paymentMode = metadataMode || (this.detectRazorpay(t) ? "Razorpay" : "—");

      const subtotal = typeof md.subtotalInr === "number" ? Number(md.subtotalInr).toFixed(2) : "—";
      const gst = typeof md.gstInr === "number" ? Number(md.gstInr).toFixed(2) : "—";
      const totalAmount =
        typeof md.totalInr === "number"
          ? Number(md.totalInr).toFixed(2)
          : this.amountPaiseToInrString(t.amount);

      const source = metadataMode.toLowerCase() === "cash" || t.orderId.startsWith("cash_")
        ? "Admin Cash"
        : this.detectRazorpay(t)
          ? "Razorpay"
          : "Unknown";

      const reference = this.pickReference(t);
      const date = t.createdAt ? new Date(t.createdAt).toISOString() : "—";

      return {
        id: t.id,
        date,
        memberName: memberName || "—",
        memberMobile,
        plan,
        classType,
        paymentMode,
        subtotal,
        gst,
        totalAmount,
        reference: reference || "—",
        source,
      };
    });

    const paymentModeNeedle = filters.paymentMode?.trim().toLowerCase();
    const qNeedle = filters.q?.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (paymentModeNeedle && r.paymentMode.toLowerCase() !== paymentModeNeedle) return false;
      if (qNeedle) {
        const hay = [r.memberName, r.memberMobile, r.reference].join(" ").toLowerCase();
        if (!hay.includes(qNeedle)) return false;
      }
      return true;
    });
    return filtered;
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const doc = await UserModel.findOne({ mobile });
    return toApi<User>(doc) ?? undefined;
  }

  async getUser(id: string): Promise<User | undefined> {
    const doc = await UserModel.findById(id);
    return toApi<User>(doc) ?? undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const doc = await UserModel.create(user);
    return toApi<User>(doc)!;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const doc = await UserModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    return toApi<User>(doc) ?? undefined;
  }

  async deleteAccountByUserId(userId: string): Promise<void> {
    const existing = await UserModel.findById(userId).select("_id").lean();
    if (!existing) return;

    const members = await MemberModel.find({ userId }).select("_id").lean();
    const memberIds = members.map((m) => String(m._id));

    if (memberIds.length > 0) {
      await BookingModel.deleteMany({ memberId: { $in: memberIds } });
      await MembershipModel.deleteMany({ memberId: { $in: memberIds } });
    }
    await MemberModel.deleteMany({ userId });
    await WaiverSignatureModel.deleteMany({ userId });
    await UserModel.findByIdAndDelete(userId);
  }

  async getMembersByUserId(userId: string): Promise<Member[]> {
    const docs = await MemberModel.find({ userId }).sort({ createdAt: 1 });
    return toApiList<Member>(docs);
  }

  async getMember(id: string): Promise<Member | undefined> {
    const doc = await MemberModel.findById(id);
    return toApi<Member>(doc) ?? undefined;
  }

  async createMember(member: InsertMember): Promise<Member> {
    const doc = await MemberModel.create(member);
    return toApi<Member>(doc)!;
  }

  async updateMember(id: string, data: Partial<InsertMember>): Promise<Member | undefined> {
    const doc = await MemberModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    return toApi<Member>(doc) ?? undefined;
  }

  async getMemberMemberships(memberId: string): Promise<Membership[]> {
    const docs = await MembershipModel.find({ memberId }).sort({ createdAt: 1 });
    return toApiList<Membership>(docs);
  }

  async getMembershipById(id: string): Promise<Membership | undefined> {
    const doc = await MembershipModel.findById(id);
    return toApi<Membership>(doc) ?? undefined;
  }

  async createMembership(membership: InsertMembership): Promise<Membership> {
    const doc = await MembershipModel.create(membership);
    return toApi<Membership>(doc)!;
  }

  async updateMembership(id: string, data: Partial<InsertMembership>): Promise<Membership | undefined> {
    const doc = await MembershipModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    return toApi<Membership>(doc) ?? undefined;
  }

  async updateMembershipSessions(id: string, sessionsRemaining: number): Promise<void> {
    await MembershipModel.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { sessionsRemaining } });
  }

  async incrementMembershipSessions(id: string, delta: number): Promise<void> {
    await MembershipModel.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $inc: { sessionsRemaining: delta } }
    );
  }

  async decrementMembershipSessionsIfPositive(id: string): Promise<boolean> {
    const updated = await MembershipModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        sessionsRemaining: { $gt: 0 },
      },
      { $inc: { sessionsRemaining: -1 } },
      { new: true }
    );
    return Boolean(updated);
  }

  async getClassTypes(): Promise<Array<{ id: string; name: string; ageGroup: string; strengthLevel: number; infoBullets: string[]; isActive: boolean }>> {
    const docs = await ClassTypeModel.find({ isActive: true });
    return toApiList<ClassType>(docs).map((r) => ({
      id: r.id,
      name: r.name,
      ageGroup: r.ageGroup,
      strengthLevel: r.strengthLevel,
      infoBullets: r.infoBullets ?? [],
      isActive: r.isActive,
    }));
  }

  async createClassType(item: InsertClassType): Promise<ClassType> {
    const doc = await ClassTypeModel.create(item);
    return toApi<ClassType>(doc)!;
  }

  async getMembershipPlansGroupedByClassType(): Promise<Record<string, Array<{ id: string; name: string; sessions: number; price: number; validityDays: number }>>> {
    const planDocs = await MembershipPlanModel.find({ isActive: true });
    const plans = toApiList<MembershipPlan>(planDocs);
    const types = await ClassTypeModel.find({ isActive: true });
    const typeNames: Record<string, string> = {};
    for (const t of types) typeNames[(t as any)._id.toString()] = t.name;
    const out: Record<string, Array<{ id: string; name: string; sessions: number; price: number; validityDays: number }>> = {};
    for (const p of plans) {
      const name = typeNames[p.classTypeId] ?? p.classTypeId;
      if (!out[name]) out[name] = [];
      out[name].push({
        id: p.id,
        name: p.name,
        sessions: p.sessionsTotal,
        price: p.price,
        validityDays: p.validityDays,
      });
    }
    for (const name of Object.keys(out)) {
      out[name].sort((a, b) => a.price - b.price);
    }
    return out;
  }

  async getMembershipPlansByClassType(classTypeId: string): Promise<Array<{ id: string; name: string; sessions: number; price: number; validityDays: number }>> {
    const plans = await MembershipPlanModel.find({ classTypeId, isActive: true }).sort({ price: 1 });
    return toApiList<MembershipPlan>(plans).map((p) => ({
      id: p.id,
      name: p.name,
      sessions: p.sessionsTotal,
      price: p.price,
      validityDays: p.validityDays,
    }));
  }

  async createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan> {
    const doc = await MembershipPlanModel.create(plan);
    return toApi<MembershipPlan>(doc)!;
  }

  async getScheduleForBranchAndDate(
    branch: string,
    dateStr: string
  ): Promise<Array<{ scheduleId: string; sessionDate: string; classId: string; category: string; branch: string; startTime: string; endTime: string; capacity: number; genderRestriction: "NONE" | "FEMALE_ONLY" }>> {
    const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
    const slots = await ScheduleSlotModel.find({ branch, dayOfWeek, isActive: true });
    const types = await ClassTypeModel.find({});
    const typeMap: Record<string, { name: string }> = {};
    for (const t of types) typeMap[(t as any)._id.toString()] = { name: t.name };
    return slots
      .map((s) => {
        const sid = (s as any)._id.toString();
        const name = typeMap[s.classTypeId]?.name ?? "";
        return {
          scheduleId: sid,
          sessionDate: dateStr,
          classId: slug(name),
          category: name,
          branch: s.branch,
          startTime: `${pad2(s.startHour)}:${pad2(s.startMinute)}`,
          endTime: `${pad2(s.endHour)}:${pad2(s.endMinute)}`,
          capacity: s.capacity,
          genderRestriction: s.genderRestriction ?? "NONE",
        };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async getSchedule(): Promise<ScheduleSlotWithCategory[]> {
    const slots = await ScheduleSlotModel.find({ isActive: true });
    const types = await ClassTypeModel.find({});
    const typeMap: Record<string, { name: string }> = {};
    for (const t of types) typeMap[(t as any)._id.toString()] = { name: t.name };
    return toApiList<ScheduleSlot>(slots).map((s) => ({
      ...s,
      genderRestriction: s.genderRestriction ?? "NONE",
      category: typeMap[s.classTypeId]?.name ?? "",
      classId: slug(typeMap[s.classTypeId]?.name ?? ""),
    }));
  }

  async getScheduleSlot(id: string): Promise<ScheduleSlotWithCategory | undefined> {
    const slot = await ScheduleSlotModel.findById(id);
    if (!slot) return undefined;
    const s = toApi<ScheduleSlot>(slot);
    if (!s) return undefined;
    const ct = await ClassTypeModel.findById(slot.classTypeId);
    const category = ct?.name ?? "";
    return { ...s, genderRestriction: s.genderRestriction ?? "NONE", category, classId: slug(category) };
  }

  async createScheduleSlot(item: InsertScheduleSlot): Promise<ScheduleSlot> {
    const doc = await ScheduleSlotModel.create(item);
    return toApi<ScheduleSlot>(doc)!;
  }

  async findOverlappingScheduleSlots(params: {
    classTypeId: string;
    branch: string;
    dayOfWeek: number;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    excludeId?: string;
  }): Promise<ScheduleSlot[]> {
    const { classTypeId, branch, dayOfWeek, startHour, startMinute, endHour, endMinute, excludeId } = params;
    const filter: Record<string, unknown> = {
      classTypeId,
      branch,
      dayOfWeek,
    };
    if (excludeId) filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    const docs = await ScheduleSlotModel.find(filter);
    const startMins = startHour * 60 + startMinute;
    const endMins = endHour * 60 + endMinute;
    const overlapping = docs.filter((d) => {
      const dStart = d.startHour * 60 + (d.startMinute ?? 0);
      const dEnd = d.endHour * 60 + (d.endMinute ?? 0);
      return startMins < dEnd && dStart < endMins;
    });
    return toApiList<ScheduleSlot>(overlapping);
  }

  async updateClassType(
    id: string,
    data: Partial<Pick<ClassType, "name" | "ageGroup" | "strengthLevel" | "infoBullets" | "isActive">>
  ): Promise<ClassType | undefined> {
    const doc = await ClassTypeModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    return toApi<ClassType>(doc) ?? undefined;
  }

  async updateMembershipPlan(
    id: string,
    data: Partial<Pick<MembershipPlan, "name" | "sessionsTotal" | "validityDays" | "price" | "isActive">>
  ): Promise<MembershipPlan | undefined> {
    const doc = await MembershipPlanModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    return toApi<MembershipPlan>(doc) ?? undefined;
  }

  async updateScheduleSlot(
    id: string,
    data: Partial<Pick<ScheduleSlot, "branch" | "dayOfWeek" | "startHour" | "startMinute" | "endHour" | "endMinute" | "capacity" | "isActive" | "genderRestriction" | "notes">>
  ): Promise<ScheduleSlot | undefined> {
    const doc = await ScheduleSlotModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    return toApi<ScheduleSlot>(doc) ?? undefined;
  }

  async getBookingsForMember(memberId: string): Promise<BookingRecord[]> {
    const docs = await BookingModel.find({ memberId }).sort({ sessionDate: 1 });
    return toApiList<BookingRecord>(docs);
  }

  async getBookingsForSession(scheduleId: string, sessionDate: string): Promise<BookingRecord[]> {
    const docs = await BookingModel.find({ scheduleId, sessionDate });
    return toApiList<BookingRecord>(docs);
  }

  async getUpcomingBookingsPreviewForScheduleSlot(
    scheduleId: string,
    fromDate: string,
    limit = 10
  ): Promise<UpcomingScheduleSlotBookingPreview> {
    const cappedLimit = Math.max(1, limit);
    const allDocs = await BookingModel.find({
      scheduleId,
      sessionDate: { $gte: fromDate },
      status: { $in: ["BOOKED", "WAITLIST"] },
    })
      .sort({ sessionDate: 1, status: 1, waitlistPosition: 1, createdAt: 1 })
      .lean();

    const confirmedCount = allDocs.filter((b: any) => b.status === "BOOKED").length;
    const waitlistCount = allDocs.filter((b: any) => b.status === "WAITLIST").length;
    const totalUpcomingAffected = allDocs.length;

    const previewDocs = allDocs.slice(0, cappedLimit);
    const memberIds = Array.from(new Set(previewDocs.map((b: any) => String(b.memberId)).filter(Boolean)));
    const memberDocs = memberIds.length
      ? await MemberModel.find({ _id: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
      : [];

    const memberNameMap: Record<string, string> = {};
    const memberUserIdMap: Record<string, string> = {};
    for (const m of memberDocs as any[]) {
      const id = m._id.toString();
      memberNameMap[id] = m.name ?? "";
      memberUserIdMap[id] = m.userId ?? "";
    }

    const userIds = Array.from(new Set(Object.values(memberUserIdMap).filter(Boolean)));
    const userDocs = userIds.length
      ? await UserModel.find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
      : [];
    const userMobileMap: Record<string, string> = {};
    for (const u of userDocs as any[]) {
      userMobileMap[u._id.toString()] = u.mobile ?? "";
    }

    const items: UpcomingScheduleSlotBookingPreviewItem[] = previewDocs.map((b: any) => {
      const memberId = String(b.memberId ?? "");
      const userId = memberUserIdMap[memberId] ?? "";
      return {
        bookingId: String(b._id),
        memberId,
        memberName: memberNameMap[memberId] ?? "",
        memberMobile: userId ? userMobileMap[userId] ?? "" : "",
        sessionDate: String(b.sessionDate ?? ""),
        status: b.status === "WAITLIST" ? "WAITLIST" : "BOOKED",
        waitlistPosition: b.waitlistPosition ?? null,
      };
    });

    return {
      items,
      summary: {
        confirmedCount,
        waitlistCount,
        totalUpcomingAffected,
        displayedCount: items.length,
        remainingCount: Math.max(0, totalUpcomingAffected - items.length),
      },
    };
  }

  async getBooking(id: string): Promise<BookingRecord | undefined> {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    const doc = await BookingModel.findById(id);
    return toApi<BookingRecord>(doc) ?? undefined;
  }

  async getUpcomingSessionsByBranch(
    branch: string,
    fromDate: string,
    days: number
  ): Promise<Array<{ date: string; sessions: Array<{ scheduleId: string; sessionDate: string; startTime: string; endTime: string; category: string; bookingCount: number; capacity: number }> }>> {
    const types = await ClassTypeModel.find({});
    const typeMap: Record<string, string> = {};
    for (const t of types) typeMap[(t as any)._id.toString()] = t.name;
    const result: Array<{ date: string; sessions: Array<{ scheduleId: string; sessionDate: string; startTime: string; endTime: string; category: string; bookingCount: number; capacity: number }> }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate + "T12:00:00");
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay();
      const slots = await ScheduleSlotModel.find({ branch, dayOfWeek }).sort({ startHour: 1, startMinute: 1 });
      const sessions: Array<{ scheduleId: string; sessionDate: string; startTime: string; endTime: string; category: string; bookingCount: number; capacity: number }> = [];
      for (const slot of slots) {
        const sid = (slot as any)._id.toString();
        const category = typeMap[slot.classTypeId] ?? "";
        const startTime = `${pad2(slot.startHour)}:${pad2(slot.startMinute)}`;
        const endTime = `${pad2(slot.endHour)}:${pad2(slot.endMinute)}`;
        const bookings = await BookingModel.find({ scheduleId: sid, sessionDate: dateStr, status: { $in: ["BOOKED", "ATTENDED"] } });
        sessions.push({
          scheduleId: sid,
          sessionDate: dateStr,
          startTime,
          endTime,
          category,
          bookingCount: bookings.length,
          capacity: slot.capacity,
        });
      }
      result.push({ date: dateStr, sessions });
    }
    return result;
  }

  async getBranches(): Promise<string[]> {
    const branches = await ScheduleSlotModel.distinct("branch");
    return (branches as string[]).sort();
  }

  async createBooking(booking: InsertBooking): Promise<BookingRecord> {
    const doc = await BookingModel.create(booking);
    return toApi<BookingRecord>(doc)!;
  }

  async updateBookingStatus(id: string, status: string, waitlistPosition?: number | null): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (waitlistPosition !== undefined) update.waitlistPosition = waitlistPosition;
    await BookingModel.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: update });
  }

  async createWaiver(waiver: InsertWaiver): Promise<void> {
    await WaiverSignatureModel.create(waiver);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const doc = await TransactionModel.create(transaction);
    return toApi<Transaction>(doc)!;
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    const doc = await TransactionModel.findById(id);
    return toApi<Transaction>(doc) ?? undefined;
  }

  async updateTransaction(id: string, data: Partial<Pick<Transaction, "status" | "paymentId" | "signature">>): Promise<Transaction | undefined> {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    const doc = await TransactionModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    return toApi<Transaction>(doc) ?? undefined;
  }

  async getTransactionByOrderId(orderId: string): Promise<Transaction | undefined> {
    const doc = await TransactionModel.findOne({ orderId });
    return toApi<Transaction>(doc) ?? undefined;
  }

  async listTransactionsForUser(userId: string, opts: { limit: number }): Promise<Transaction[]> {
    const docs = await TransactionModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(opts.limit)
      .exec();
    return toApiList<Transaction>(docs);
  }

  async listAdminTransactions(params: {
    page: number;
    limit: number;
    filters: AdminTransactionsFilters;
  }): Promise<{ items: AdminTransactionRow[]; total: number }> {
    const all = await this.buildAdminTransactionRows(params.filters);
    const total = all.length;
    const start = (params.page - 1) * params.limit;
    const items = all.slice(start, start + params.limit);
    return { items, total };
  }

  async listAdminTransactionsForExport(filters: AdminTransactionsFilters): Promise<AdminTransactionRow[]> {
    return this.buildAdminTransactionRows(filters);
  }

  async getAppSetting(key: string): Promise<string | null> {
    const doc = await AppSettingModel.findById(key);
    return doc?.value ?? null;
  }

  async setAppSetting(key: string, value: string): Promise<void> {
    await AppSettingModel.findByIdAndUpdate(key, { $set: { value } }, { upsert: true });
  }

  async listUsers(params: { page: number; limit: number; name?: string }): Promise<{ items: User[]; total: number }> {
    const { page, limit, name } = params;
    const filter: Record<string, unknown> = {};
    if (name && name.trim()) {
      filter.name = { $regex: name.trim(), $options: "i" };
    }
    const [docs, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      UserModel.countDocuments(filter),
    ]);
    return { items: toApiList<User>(docs), total };
  }

  async listScheduleSlots(params: {
    page: number;
    limit: number;
    classTypeName?: string;
    branch?: string;
    dayOfWeek?: number;
    startTime?: string;
  }): Promise<{ items: (ScheduleSlotWithCategory & { startTime: string; endTime: string })[]; total: number }> {
    const { page, limit, classTypeName, branch, dayOfWeek, startTime } = params;
    const filter: Record<string, unknown> = {};
    if (branch?.trim()) filter.branch = { $regex: branch.trim(), $options: "i" };
    if (dayOfWeek !== undefined && dayOfWeek !== null) filter.dayOfWeek = dayOfWeek;
    if (classTypeName?.trim()) {
      const ct = await ClassTypeModel.findOne({ name: new RegExp(classTypeName.trim(), "i") });
      if (ct) filter.classTypeId = (ct as any)._id.toString();
    }
    const slots = await ScheduleSlotModel.find(filter).sort({ dayOfWeek: 1, startHour: 1, startMinute: 1 });
    const types = await ClassTypeModel.find({});
    const typeMap: Record<string, string> = {};
    for (const t of types) typeMap[(t as any)._id.toString()] = t.name;

    let list = toApiList<ScheduleSlot>(slots).map((s) => ({
      ...s,
      genderRestriction: s.genderRestriction ?? "NONE",
      category: typeMap[s.classTypeId] ?? "",
      classId: slug(typeMap[s.classTypeId] ?? ""),
      startTime: `${pad2(s.startHour)}:${pad2(s.startMinute)}`,
      endTime: `${pad2(s.endHour)}:${pad2(s.endMinute)}`,
    }));

    if (startTime?.trim()) {
      const [h, m] = startTime.trim().split(/[:\s]/).map(Number);
      const mins = (h ?? 0) * 60 + (m ?? 0);
      list = list.filter((s) => s.startHour * 60 + s.startMinute === mins || (s.startHour * 60 + s.startMinute >= mins && (s.endHour * 60 + s.endMinute) > mins));
    }

    const total = list.length;
    list = list.slice((page - 1) * limit, (page - 1) * limit + limit);
    return { items: list, total };
  }

  async listClassTypes(params: { page: number; limit: number }): Promise<{ items: ClassType[]; total: number }> {
    const { page, limit } = params;
    const [docs, total] = await Promise.all([
      ClassTypeModel.find({}).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).exec(),
      ClassTypeModel.countDocuments({}),
    ]);
    return { items: toApiList<ClassType>(docs), total };
  }

  async listMembershipPlans(params: {
    page: number;
    limit: number;
    classTypeName?: string;
    planName?: string;
  }): Promise<{ items: (MembershipPlan & { classTypeName: string })[]; total: number }> {
    const { page, limit, classTypeName, planName } = params;
    const filter: Record<string, unknown> = {};
    if (planName?.trim()) filter.name = { $regex: planName.trim(), $options: "i" };
    if (classTypeName?.trim()) {
      const ct = await ClassTypeModel.findOne({ name: new RegExp(classTypeName.trim(), "i") });
      if (ct) filter.classTypeId = (ct as any)._id.toString();
    }
    const [planDocs, total] = await Promise.all([
      MembershipPlanModel.find(filter).sort({ classTypeId: 1, name: 1 }).skip((page - 1) * limit).limit(limit).exec(),
      MembershipPlanModel.countDocuments(filter),
    ]);
    const plans = toApiList<MembershipPlan>(planDocs);
    const typeIds = Array.from(new Set(plans.map((p) => p.classTypeId)));
    const types = await ClassTypeModel.find({ _id: { $in: typeIds.map((id) => new mongoose.Types.ObjectId(id)) } });
    const typeMap: Record<string, string> = {};
    for (const t of types) typeMap[(t as any)._id.toString()] = t.name;
    const items = plans.map((p) => ({ ...p, classTypeName: typeMap[p.classTypeId] ?? p.classTypeId }));
    return { items, total };
  }

  async listMembers(params: {
    page: number;
    limit: number;
    phone?: string;
    name?: string;
    email?: string;
  }): Promise<{ items: (Member & { mobile?: string })[]; total: number }> {
    const { page, limit, phone, name, email } = params;
    const memberRoleUsers = await UserModel.find({ userRole: "MEMBER" }).select("_id");
    const memberRoleUserIds = new Set(memberRoleUsers.map((u) => (u as any)._id.toString()));
    if (memberRoleUserIds.size === 0) return { items: [], total: 0 };

    const andConditions: Record<string, unknown>[] = [];
    if (phone?.trim()) {
      const phoneUsers = await UserModel.find({ mobile: { $regex: phone.trim(), $options: "i" } }).select("_id");
      const phoneUserIds = phoneUsers
        .map((u) => (u as any)._id.toString())
        .filter((id) => memberRoleUserIds.has(id));
      if (phoneUserIds.length === 0) return { items: [], total: 0 };
      andConditions.push({ userId: { $in: phoneUserIds } });
    }
    if (name?.trim()) {
      const nameUsers = await UserModel.find({ name: { $regex: name.trim(), $options: "i" } }).select("_id");
      const nameUserIds = nameUsers
        .map((u) => (u as any)._id.toString())
        .filter((id) => memberRoleUserIds.has(id));
      andConditions.push({
        $or: [
          { name: { $regex: name.trim(), $options: "i" } },
          ...(nameUserIds.length > 0 ? [{ userId: { $in: nameUserIds } }] : []),
        ],
      });
    }
    if (email?.trim()) {
      andConditions.push({ email: { $regex: email.trim(), $options: "i" } });
    }
    andConditions.push({ userId: { $in: Array.from(memberRoleUserIds) } });
    const filter = { $and: andConditions };
    const [memberDocs, total] = await Promise.all([
      MemberModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      MemberModel.countDocuments(filter),
    ]);
    const members = toApiList<Member>(memberDocs);
    const uIds = Array.from(new Set(members.map((m) => m.userId)));
    const users = await UserModel.find({ _id: { $in: uIds.map((id) => new mongoose.Types.ObjectId(id)) } });
    const userMap: Record<string, string> = {};
    for (const u of users) userMap[(u as any)._id.toString()] = u.mobile;
    const items = members.map((m) => ({ ...m, mobile: userMap[m.userId] }));
    return { items, total };
  }

  async listMemberships(params: {
    page: number;
    limit: number;
    memberName?: string;
    memberMobile?: string;
    classTypeName?: string;
    startDateFrom?: string;
    startDateTo?: string;
    expiryDateFrom?: string;
    expiryDateTo?: string;
  }): Promise<{
    items: (Membership & { memberName?: string; memberMobile?: string; planName?: string; classTypeName?: string })[];
    total: number;
  }> {
    const { page, limit } = params;
    const all = await this.buildAdminMembershipRows(params);
    const total = all.length;
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);
    return { items, total };
  }

  async listMembershipsForExport(filters: {
    memberName?: string;
    memberMobile?: string;
    classTypeName?: string;
    startDateFrom?: string;
    startDateTo?: string;
    expiryDateFrom?: string;
    expiryDateTo?: string;
  }): Promise<AdminMembershipRow[]> {
    const items = await this.buildAdminMembershipRows(filters);
    return items.map((m) => ({
      id: m.id,
      memberName: m.memberName ?? "—",
      memberMobile: m.memberMobile ?? "—",
      planName: m.planName ?? "—",
      classTypeName: m.classTypeName ?? "—",
      sessionsRemaining: String(m.sessionsRemaining ?? "—"),
      startDate: m.startDate ? new Date(m.startDate).toISOString() : "—",
      expiryDate: m.expiryDate ? new Date(m.expiryDate).toISOString() : "—",
      extension: m.extensionApplied ? "Applied" : m.extensionRequestedAt ? "Requested" : "—",
    }));
  }

  private async buildAdminMembershipRows(filters: {
    memberName?: string;
    memberMobile?: string;
    classTypeName?: string;
    startDateFrom?: string;
    startDateTo?: string;
    expiryDateFrom?: string;
    expiryDateTo?: string;
  }): Promise<(Membership & { memberName?: string; memberMobile?: string; planName?: string; classTypeName?: string })[]> {
    const {
      memberName,
      memberMobile,
      classTypeName,
      startDateFrom,
      startDateTo,
      expiryDateFrom,
      expiryDateTo,
    } = filters;
    const filter: Record<string, unknown> = {};

    if (classTypeName?.trim()) {
      const classTypeDocs = await ClassTypeModel.find({
        name: { $regex: classTypeName.trim(), $options: "i" },
      }).select("_id");
      const classTypeIds = classTypeDocs.map((c) => (c as any)._id.toString());
      if (classTypeIds.length === 0) return [];
      const planDocs = await MembershipPlanModel.find({
        classTypeId: { $in: classTypeIds },
      }).select("_id");
      const planIds = planDocs.map((p) => (p as any)._id.toString());
      if (planIds.length === 0) return [];
      filter.membershipPlanId = { $in: planIds };
    }

    const startDateFilter: Record<string, Date> = {};
    if (startDateFrom?.trim()) {
      const start = this.normalizeDayStartUtc(startDateFrom.trim());
      if (start) startDateFilter.$gte = start;
    }
    if (startDateTo?.trim()) {
      const end = this.normalizeDayEndUtc(startDateTo.trim());
      if (end) startDateFilter.$lte = end;
    }
    if (
      startDateFilter.$gte &&
      startDateFilter.$lte &&
      startDateFilter.$gte.getTime() > startDateFilter.$lte.getTime()
    ) {
      return [];
    }
    if (Object.keys(startDateFilter).length > 0) {
      filter.startDate = startDateFilter;
    }

    const expiryDateFilter: Record<string, Date> = {};
    if (expiryDateFrom?.trim()) {
      const start = this.normalizeDayStartUtc(expiryDateFrom.trim());
      if (start) expiryDateFilter.$gte = start;
    }
    if (expiryDateTo?.trim()) {
      const end = this.normalizeDayEndUtc(expiryDateTo.trim());
      if (end) expiryDateFilter.$lte = end;
    }
    if (
      expiryDateFilter.$gte &&
      expiryDateFilter.$lte &&
      expiryDateFilter.$gte.getTime() > expiryDateFilter.$lte.getTime()
    ) {
      return [];
    }
    if (Object.keys(expiryDateFilter).length > 0) {
      filter.expiryDate = expiryDateFilter;
    }

    // Enforce role visibility: memberships must belong to users with MEMBER role only.
    const userFilter: Record<string, unknown> = { userRole: "MEMBER" };
    if (memberMobile?.trim()) {
      const mobileNorm = memberMobile.trim().replace(/\D/g, "");
      if (mobileNorm.length > 0) {
        userFilter.mobile = { $regex: mobileNorm };
      }
    }

    const memberRoleUsers = await UserModel.find(userFilter).select("_id");
    const memberRoleUserIds = memberRoleUsers.map((u) => (u as any)._id.toString());
    if (memberRoleUserIds.length === 0) return [];

    const memberLookupFilter: Record<string, unknown> = {
      userId: { $in: memberRoleUserIds },
    };
    if (memberName?.trim()) {
      const memberNameRegex = { $regex: memberName.trim(), $options: "i" };
      const nameUsers = await UserModel.find({ name: memberNameRegex }).select("_id");
      const nameUserIds = nameUsers
        .map((u) => (u as any)._id.toString())
        .filter((id) => memberRoleUserIds.includes(id));
      memberLookupFilter.$or = [
        { name: memberNameRegex },
        ...(nameUserIds.length > 0 ? [{ userId: { $in: nameUserIds } }] : []),
      ];
    }

    const eligibleMemberDocs = await MemberModel.find(memberLookupFilter).select("_id");
    const eligibleMemberIds = eligibleMemberDocs.map((m) => (m as any)._id.toString());
    if (eligibleMemberIds.length === 0) return [];
    filter.memberId = { $in: eligibleMemberIds };

    const docs = await MembershipModel.find(filter).sort({ createdAt: -1 }).exec();
    const items = toApiList<Membership>(docs);
    const memberIds = Array.from(new Set(items.map((m) => m.memberId)));
    const planIds = Array.from(new Set(items.map((m) => m.membershipPlanId)));
    const [memberDocs, planDocs] = await Promise.all([
      MemberModel.find({ _id: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) } }),
      MembershipPlanModel.find({ _id: { $in: planIds.map((id) => new mongoose.Types.ObjectId(id)) } }),
    ]);
    const memberMap: Record<string, string> = {};
    const memberUserMap: Record<string, string> = {};
    for (const m of memberDocs) {
      const id = (m as any)._id.toString();
      memberMap[id] = m.name ?? "";
      memberUserMap[id] = (m as any).userId ?? "";
    }
    const userIds = Array.from(new Set(Object.values(memberUserMap).filter(Boolean)));
    const userDocs = userIds.length
      ? await UserModel.find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } })
      : [];
    const userMobileMap: Record<string, string> = {};
    for (const u of userDocs) userMobileMap[(u as any)._id.toString()] = u.mobile ?? "";
    const planMap: Record<string, { name: string; classTypeId: string }> = {};
    for (const p of planDocs) {
      const id = (p as any)._id.toString();
      planMap[id] = { name: p.name, classTypeId: p.classTypeId };
    }
    const classTypeIds = Array.from(new Set(Object.values(planMap).map((x) => x.classTypeId)));
    const typeDocs = await ClassTypeModel.find({ _id: { $in: classTypeIds.map((id) => new mongoose.Types.ObjectId(id)) } });
    const typeMap: Record<string, string> = {};
    for (const t of typeDocs) typeMap[(t as any)._id.toString()] = t.name;
    const enriched = items.map((m) => ({
      ...m,
      memberName: memberMap[m.memberId],
      memberMobile: memberUserMap[m.memberId] ? userMobileMap[memberUserMap[m.memberId]] : undefined,
      planName: planMap[m.membershipPlanId]?.name,
      classTypeName: planMap[m.membershipPlanId] ? typeMap[planMap[m.membershipPlanId].classTypeId] : undefined,
    }));
    return enriched;
  }

  private async buildAdminBookingsFilter(filters: AdminBookingsFilters): Promise<Record<string, unknown> | null> {
    const filter: Record<string, unknown> = {};
    if (filters.sessionDate?.trim()) {
      filter.sessionDate = filters.sessionDate.trim();
    }
    const dateFrom = filters.dateFrom?.trim();
    const dateTo = filters.dateTo?.trim();
    if (dateFrom && dateTo && dateFrom > dateTo) return null;
    if (!filters.sessionDate?.trim() && (dateFrom || dateTo)) {
      filter.sessionDate = {
        ...(dateFrom ? { $gte: dateFrom } : {}),
        ...(dateTo ? { $lte: dateTo } : {}),
      };
    }

    let mobileMemberIds: string[] | null = null;
    const mobileNeedle = filters.memberMobile?.trim();
    if (mobileNeedle) {
      const users = await UserModel.find({ mobile: { $regex: mobileNeedle, $options: "i" } }).select("_id");
      const userIds = users.map((u) => (u as any)._id.toString());
      if (userIds.length === 0) return null;
      const members = await MemberModel.find({ userId: { $in: userIds } }).select("_id");
      mobileMemberIds = members.map((m) => (m as any)._id.toString());
      if (mobileMemberIds.length === 0) return null;
    }

    let nameMemberIds: string[] | null = null;
    const memberNameNeedle = filters.memberName?.trim();
    if (memberNameNeedle) {
      const memberNameRegex = { $regex: memberNameNeedle, $options: "i" };
      const nameUsers = await UserModel.find({ name: memberNameRegex }).select("_id");
      const nameUserIds = nameUsers.map((u) => (u as any)._id.toString());
      const members = await MemberModel.find({
        $or: [{ name: memberNameRegex }, ...(nameUserIds.length > 0 ? [{ userId: { $in: nameUserIds } }] : [])],
      }).select("_id");
      nameMemberIds = members.map((m) => (m as any)._id.toString());
      if (nameMemberIds.length === 0) return null;
    }

    if (mobileMemberIds || nameMemberIds) {
      const allowedMemberIds = mobileMemberIds && nameMemberIds
        ? mobileMemberIds.filter((id) => nameMemberIds.includes(id))
        : (mobileMemberIds ?? nameMemberIds ?? []);
      if (allowedMemberIds.length === 0) return null;
      filter.memberId = { $in: allowedMemberIds };
    }

    if (filters.scheduleId?.trim()) {
      filter.scheduleId = filters.scheduleId.trim();
      return filter;
    }

    const slotFilter: Record<string, unknown> = {};
    if (filters.branch?.trim()) slotFilter.branch = filters.branch.trim();
    if (filters.classTypeName?.trim()) {
      const classTypes = await ClassTypeModel.find({
        name: { $regex: filters.classTypeName.trim(), $options: "i" },
      }).select("_id");
      const classTypeIds = classTypes.map((c) => (c as any)._id.toString());
      if (classTypeIds.length === 0) return null;
      slotFilter.classTypeId = { $in: classTypeIds };
    }

    if (Object.keys(slotFilter).length > 0) {
      const slots = await ScheduleSlotModel.find(slotFilter).select("_id");
      const slotIds = slots.map((s) => (s as any)._id.toString());
      if (slotIds.length === 0) return null;
      filter.scheduleId = { $in: slotIds };
    }

    return filter;
  }

  private async enrichBookings(
    bookings: BookingRecord[]
  ): Promise<(BookingRecord & {
    memberMobile?: string;
    memberName?: string;
    classTypeName?: string;
    startTime?: string;
    endTime?: string;
    branch?: string;
  })[]> {
    const scheduleIds = Array.from(new Set(bookings.map((b) => b.scheduleId)));
    const memberIdsFromBookings = Array.from(new Set(bookings.map((b) => b.memberId)));
    const [slots, members] = await Promise.all([
      scheduleIds.length > 0
        ? ScheduleSlotModel.find({ _id: { $in: scheduleIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        : Promise.resolve([]),
      memberIdsFromBookings.length > 0
        ? MemberModel.find({ _id: { $in: memberIdsFromBookings.map((id) => new mongoose.Types.ObjectId(id)) } })
        : Promise.resolve([]),
    ]);
    const slotMap: Record<string, { classTypeId: string; branch: string; startHour: number; startMinute: number; endHour: number; endMinute: number }> = {};
    for (const s of slots) {
      const id = (s as any)._id.toString();
      slotMap[id] = {
        classTypeId: s.classTypeId,
        branch: s.branch,
        startHour: s.startHour,
        startMinute: s.startMinute,
        endHour: s.endHour,
        endMinute: s.endMinute,
      };
    }
    const memberMap: Record<string, string> = {};
    const memberNameMap: Record<string, string> = {};
    for (const m of members) {
      const id = (m as any)._id.toString();
      memberMap[id] = (m as any).userId;
      memberNameMap[id] = (m as any).name ?? "";
    }
    const userIds = Array.from(new Set(Object.values(memberMap))).filter(Boolean);
    const users = userIds.length > 0
      ? await UserModel.find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } })
      : [];
    const userMap: Record<string, string> = {};
    for (const u of users) userMap[(u as any)._id.toString()] = u.mobile;
    const classTypeIds = Array.from(new Set(Object.values(slotMap).map((s) => s.classTypeId)));
    const types = classTypeIds.length > 0
      ? await ClassTypeModel.find({ _id: { $in: classTypeIds.map((id) => new mongoose.Types.ObjectId(id)) } })
      : [];
    const typeMap: Record<string, string> = {};
    for (const t of types) typeMap[(t as any)._id.toString()] = t.name;
    return bookings.map((b) => {
      const slot = slotMap[b.scheduleId];
      const ctName = slot ? typeMap[slot.classTypeId] : "";
      const startTime = slot ? `${pad2(slot.startHour)}:${pad2(slot.startMinute)}` : "";
      const endTime = slot ? `${pad2(slot.endHour)}:${pad2(slot.endMinute)}` : "";
      return {
        ...b,
        memberMobile: memberMap[b.memberId] ? userMap[memberMap[b.memberId]] : "",
        memberName: memberNameMap[b.memberId] ?? "",
        classTypeName: ctName,
        startTime,
        endTime,
        branch: slot?.branch,
      };
    });
  }

  async listBookings(params: {
    page: number;
    limit: number;
    sessionDate?: string;
    dateFrom?: string;
    dateTo?: string;
    memberMobile?: string;
    memberName?: string;
    scheduleId?: string;
    classTypeName?: string;
    branch?: string;
  }): Promise<{
    items: (BookingRecord & { memberMobile?: string; memberName?: string; classTypeName?: string; startTime?: string; endTime?: string; branch?: string })[];
    total: number;
  }> {
    const { page, limit, ...filters } = params;
    const filter = await this.buildAdminBookingsFilter(filters);
    if (!filter) return { items: [], total: 0 };
    const [bookingDocs, total] = await Promise.all([
      BookingModel.find(filter).sort({ sessionDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      BookingModel.countDocuments(filter),
    ]);
    const bookings = toApiList<BookingRecord>(bookingDocs);
    const items = await this.enrichBookings(bookings);
    return { items, total };
  }

  async listBookingsForExport(filters: AdminBookingsFilters): Promise<AdminBookingRow[]> {
    const filter = await this.buildAdminBookingsFilter(filters);
    if (!filter) return [];
    const bookingDocs = await BookingModel.find(filter).sort({ sessionDate: -1, createdAt: -1 }).exec();
    const bookings = toApiList<BookingRecord>(bookingDocs);
    const enriched = await this.enrichBookings(bookings);
    return enriched.map((row) => ({
      id: row.id,
      date: row.sessionDate || "—",
      time: row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : "—",
      memberName: row.memberName || "—",
      memberMobile: row.memberMobile || "—",
      classTypeName: row.classTypeName || "—",
      branch: row.branch || "—",
      status: row.status || "—",
    }));
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate30 = thirtyDaysAgo.toISOString().slice(0, 10);

    const types = await ClassTypeModel.find({});
    const typeMap: Record<string, string> = {};
    for (const t of types) typeMap[(t as any)._id.toString()] = t.name;

    // Active members: distinct memberIds with at least one membership where expiryDate > now and sessionsRemaining > 0
    const activeMemberIds = await MembershipModel.distinct("memberId", {
      expiryDate: { $gt: now },
      sessionsRemaining: { $gt: 0 },
    });
    const activeMembersCount = activeMemberIds.length;

    // Memberships expiring in next 7 / 30 days (future window)
    const [membershipsExpiringIn7Days, membershipsExpiringIn30Days] = await Promise.all([
      MembershipModel.countDocuments({
        expiryDate: { $gt: now, $lte: sevenDaysLater },
      }),
      MembershipModel.countDocuments({
        expiryDate: { $gt: now, $lte: thirtyDaysLater },
      }),
    ]);

    // Memberships expired in last 7 / 30 days (past window)
    const [membershipsExpiredInLast7Days, membershipsExpiredInLast30Days] = await Promise.all([
      MembershipModel.countDocuments({
        expiryDate: { $gte: sevenDaysAgo, $lte: now },
      }),
      MembershipModel.countDocuments({
        expiryDate: { $gte: thirtyDaysAgo, $lte: now },
      }),
    ]);

    const buildMembershipRows = async (
      filter: Record<string, unknown>
    ): Promise<DashboardMembershipRow[]> => {
      const docs = await MembershipModel.find(filter).sort({ expiryDate: 1 }).lean();
      if (docs.length === 0) return [];
      const memberIds = Array.from(new Set((docs as any[]).map((m) => m.memberId)));
      const planIds = Array.from(new Set((docs as any[]).map((m) => m.membershipPlanId)));
      const [memberDocs, planDocs] = await Promise.all([
        MemberModel.find({ _id: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean(),
        MembershipPlanModel.find({ _id: { $in: planIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean(),
      ]);
      const memberNameMap: Record<string, string> = {};
      const memberUserIdMap: Record<string, string> = {};
      for (const m of memberDocs as any[]) {
        const id = m._id.toString();
        memberNameMap[id] = m.name ?? "";
        memberUserIdMap[id] = m.userId;
      }
      const planMapById: Record<string, { name: string; classTypeId: string }> = {};
      for (const p of planDocs as any[]) {
        planMapById[p._id.toString()] = { name: p.name, classTypeId: p.classTypeId };
      }
      const ctIds = Array.from(new Set(Object.values(planMapById).map((x) => x.classTypeId)));
      const typeDocs = await ClassTypeModel.find({ _id: { $in: ctIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
      const typeNameMap: Record<string, string> = {};
      for (const t of typeDocs as any[]) typeNameMap[t._id.toString()] = t.name;
      const userIds = Array.from(new Set(Object.values(memberUserIdMap)));
      const userDocs = await UserModel.find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
      const userMobileMap: Record<string, string> = {};
      for (const u of userDocs as any[]) userMobileMap[u._id.toString()] = u.mobile ?? "";
      return (docs as any[]).map((m) => {
        const plan = planMapById[m.membershipPlanId];
        const classTypeName = plan ? typeNameMap[plan.classTypeId] ?? "" : "";
        const userId = memberUserIdMap[m.memberId];
        return {
          id: m._id.toString(),
          memberId: m.memberId,
          memberName: memberNameMap[m.memberId] ?? "",
          planName: plan?.name ?? "",
          classTypeName,
          expiryDate: (m.expiryDate as Date).toISOString(),
          sessionsRemaining: m.sessionsRemaining ?? 0,
          memberMobile: userId ? userMobileMap[userId] : undefined,
        };
      });
    };

    const [membershipsExpiringNext7Days, membershipsExpiringNext30Days, membershipsExpiredLast7Days, membershipsExpiredLast30Days] =
      await Promise.all([
        buildMembershipRows({ expiryDate: { $gt: now, $lte: sevenDaysLater } }),
        buildMembershipRows({ expiryDate: { $gt: now, $lte: thirtyDaysLater } }),
        buildMembershipRows({ expiryDate: { $gte: sevenDaysAgo, $lte: now } }),
        buildMembershipRows({ expiryDate: { $gte: thirtyDaysAgo, $lte: now } }),
      ]);

    // Today's bookings: only seat-occupying statuses (BOOKED, ATTENDED) — one booking = one seat, no double-count
    const todayBookingsCount = await BookingModel.countDocuments({
      sessionDate: todayStr,
      status: { $in: ["BOOKED", "ATTENDED"] },
    });

    // Waitlist: today and upcoming only (sessionDate >= today)
    const waitlistCountTodayAndUpcoming = await BookingModel.countDocuments({
      status: "WAITLIST",
      sessionDate: { $gte: todayStr },
    });

    // Build today's sessions for all branches (for occupancy, full/almost-full, branch-wise)
    const branches = await ScheduleSlotModel.distinct("branch");
    const dayOfWeek = new Date(todayStr + "T12:00:00").getDay();
    const allSlotsToday = await ScheduleSlotModel.find({ dayOfWeek }).sort({ branch: 1, startHour: 1, startMinute: 1 });

    let totalBookedToday = 0;
    let totalCapacityToday = 0;
    const classesFullToday: DashboardSessionRow[] = [];
    const classesAlmostFullToday: DashboardSessionRow[] = [];
    const branchBooked: Record<string, number> = {};
    const branchCapacity: Record<string, number> = {};
    for (const b of branches) {
      branchBooked[b] = 0;
      branchCapacity[b] = 0;
    }

    for (const slot of allSlotsToday) {
      const sid = (slot as any)._id.toString();
      const category = typeMap[slot.classTypeId] ?? "";
      const startTime = `${pad2(slot.startHour)}:${pad2(slot.startMinute)}`;
      const endTime = `${pad2(slot.endHour)}:${pad2(slot.endMinute)}`;
      const bookingCount = await BookingModel.countDocuments({
        scheduleId: sid,
        sessionDate: todayStr,
        status: { $in: ["BOOKED", "ATTENDED"] },
      });
      const capacity = slot.capacity;
      totalBookedToday += bookingCount;
      totalCapacityToday += capacity;
      branchBooked[slot.branch] = (branchBooked[slot.branch] ?? 0) + bookingCount;
      branchCapacity[slot.branch] = (branchCapacity[slot.branch] ?? 0) + capacity;

      const row: DashboardSessionRow = {
        scheduleId: sid,
        sessionDate: todayStr,
        startTime,
        endTime,
        category,
        branch: slot.branch,
        bookingCount,
        capacity,
      };
      if (bookingCount >= capacity) {
        classesFullToday.push(row);
      } else if (capacity > 0 && bookingCount >= capacity * ALMOST_FULL_OCCUPANCY_THRESHOLD) {
        classesAlmostFullToday.push(row);
      }
    }

    const todayOccupancyRatePercent =
      totalCapacityToday > 0 ? Math.round((totalBookedToday / totalCapacityToday) * 100) : 0;

    const branchWiseBookingsAndOccupancy: DashboardBranchStats[] = branches.map((branch) => {
      const booked = branchBooked[branch] ?? 0;
      const cap = branchCapacity[branch] ?? 0;
      const occupancyRatePercent = cap > 0 ? Math.round((booked / cap) * 100) : 0;
      return { branch, bookingCount: booked, occupancyRatePercent };
    });

    // Most booked class types (last 30 days, top 5) — only seat-occupying statuses
    const slotIds = (await ScheduleSlotModel.find({}).select("_id classTypeId")).map((s: any) => ({
      id: s._id.toString(),
      classTypeId: s.classTypeId,
    }));
    const slotIdToClassTypeId: Record<string, string> = {};
    for (const s of slotIds) slotIdToClassTypeId[s.id] = s.classTypeId;

    const bookingAgg = await BookingModel.aggregate([
      {
        $match: {
          sessionDate: { $gte: fromDate30 },
          status: { $in: ["BOOKED", "ATTENDED"] },
        },
      },
      { $group: { _id: "$scheduleId", count: { $sum: 1 } } },
    ]);
    const classTypeCount: Record<string, number> = {};
    for (const g of bookingAgg) {
      const ctId = slotIdToClassTypeId[g._id];
      if (ctId) classTypeCount[ctId] = (classTypeCount[ctId] ?? 0) + g.count;
    }
    const mostBookedClassTypesLast30Days: DashboardClassTypeRank[] = Object.entries(classTypeCount)
      .map(([classTypeId, bookingCount]) => ({
        classTypeName: typeMap[classTypeId] ?? classTypeId,
        bookingCount,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 5);

    // Recent enrollments (memberships, sorted by createdAt desc)
    const recentMembershipDocs = await MembershipModel.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    const memberIds = Array.from(new Set(recentMembershipDocs.map((m: any) => m.memberId)));
    const planIds = Array.from(new Set(recentMembershipDocs.map((m: any) => m.membershipPlanId)));
    const [memberDocs, planDocs] = await Promise.all([
      MemberModel.find({ _id: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean(),
      MembershipPlanModel.find({ _id: { $in: planIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean(),
    ]);
    const memberNameMap: Record<string, string> = {};
    for (const m of memberDocs as any[]) memberNameMap[m._id.toString()] = m.name ?? "";
    const planMapById: Record<string, { name: string; classTypeId: string }> = {};
    for (const p of planDocs as any[]) {
      planMapById[p._id.toString()] = { name: p.name, classTypeId: p.classTypeId };
    }
    const ctIds = Array.from(new Set(Object.values(planMapById).map((x) => x.classTypeId)));
    const typeDocs = await ClassTypeModel.find({ _id: { $in: ctIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
    const typeNameMap: Record<string, string> = {};
    for (const t of typeDocs as any[]) typeNameMap[t._id.toString()] = t.name;

    const recentEnrollments: DashboardRecentEnrollment[] = recentMembershipDocs.map((m: any) => {
      const id = m._id.toString();
      const plan = planMapById[m.membershipPlanId];
      const classTypeName = plan ? typeNameMap[plan.classTypeId] : undefined;
      return {
        id,
        memberName: memberNameMap[m.memberId] ?? "",
        planName: plan?.name ?? "",
        classTypeName,
        createdAt: (m.createdAt as Date).toISOString(),
      };
    });

    return {
      activeMembersCount,
      membershipsExpiringIn7Days,
      membershipsExpiringIn30Days,
      membershipsExpiredInLast7Days,
      membershipsExpiredInLast30Days,
      membershipsExpiringNext7Days,
      membershipsExpiringNext30Days,
      membershipsExpiredLast7Days,
      membershipsExpiredLast30Days,
      todayBookingsCount,
      todayOccupancyRatePercent,
      classesFullToday,
      classesAlmostFullToday,
      waitlistCountTodayAndUpcoming,
      mostBookedClassTypesLast30Days,
      recentEnrollments,
      branchWiseBookingsAndOccupancy,
    };
  }
}

export const storage = new MongoStorage();
