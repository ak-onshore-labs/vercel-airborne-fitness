import type {
  Member,
  InsertMember,
  Membership,
  InsertMembership,
  ScheduleSlot,
  InsertScheduleSlot,
  BookingRecord,
  InsertBooking,
  InsertWaiver,
  InsertKidDetail,
  ClassType,
  MembershipPlan,
} from "@shared/schema";
import {
  MemberModel,
  ClassTypeModel,
  MembershipPlanModel,
  ScheduleSlotModel,
  MembershipModel,
  BookingModel,
  WaiverSignatureModel,
  KidDetailModel,
  AppSettingModel,
} from "./models";
import type { Document } from "mongoose";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** Normalize Mongoose doc to API shape with `id` instead of `_id` */
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

export interface IStorage {
  getMemberByPhone(phone: string): Promise<Member | undefined>;
  getMember(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, data: Partial<InsertMember>): Promise<Member | undefined>;

  getMemberMemberships(memberId: string): Promise<Membership[]>;
  getMembershipById(id: string): Promise<Membership | undefined>;
  createMembership(membership: InsertMembership): Promise<Membership>;
  updateMembership(id: string, data: Partial<InsertMembership>): Promise<Membership | undefined>;
  updateMembershipSessions(id: string, sessionsRemaining: number): Promise<void>;

  getClassTypes(): Promise<Array<{ id: string; name: string; ageGroup: string; strengthLevel: number; infoBullets: string[]; isActive: boolean }>>;
  getMembershipPlansGroupedByClassType(): Promise<Record<string, Array<{ id: string; name: string; sessions: number; price: number; validityDays: number }>>>;
  getMembershipPlansByClassType(classTypeId: string): Promise<Array<{ id: string; name: string; sessions: number; price: number; validityDays: number }>>;
  getSchedule(): Promise<ScheduleSlotWithCategory[]>;
  getScheduleForBranchAndDate(branch: string, date: string): Promise<Array<{ scheduleId: string; sessionDate: string; classId: string; category: string; branch: string; startTime: string; endTime: string; capacity: number }>>;
  getScheduleSlot(id: string): Promise<ScheduleSlotWithCategory | undefined>;
  createScheduleSlot(item: InsertScheduleSlot): Promise<ScheduleSlot>;
  updateClassType(id: string, data: Partial<Pick<ClassType, "name" | "ageGroup" | "strengthLevel" | "infoBullets" | "isActive">>): Promise<ClassType | undefined>;
  updateMembershipPlan(id: string, data: Partial<Pick<MembershipPlan, "name" | "sessionsTotal" | "validityDays" | "price" | "isActive">>): Promise<MembershipPlan | undefined>;
  updateScheduleSlot(id: string, data: Partial<Pick<ScheduleSlot, "branch" | "dayOfWeek" | "startHour" | "startMinute" | "endHour" | "endMinute" | "capacity" | "isActive" | "notes">>): Promise<ScheduleSlot | undefined>;

  getBookingsForMember(memberId: string): Promise<BookingRecord[]>;
  getBookingsForSession(scheduleId: string, sessionDate: string): Promise<BookingRecord[]>;
  createBooking(booking: InsertBooking): Promise<BookingRecord>;
  updateBookingStatus(id: string, status: string, waitlistPosition?: number): Promise<void>;

  createWaiver(waiver: InsertWaiver): Promise<void>;
  createKidDetail(detail: InsertKidDetail): Promise<void>;

  getAppSetting(key: string): Promise<string | null>;
}

export class MongoStorage implements IStorage {
  async getMemberByPhone(phone: string): Promise<Member | undefined> {
    const doc = await MemberModel.findOne({ phone });
    return toApi<Member>(doc) ?? undefined;
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
    await MembershipModel.updateOne({ _id: id }, { $set: { sessionsRemaining } });
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
    return out;
  }

  async getMembershipPlansByClassType(classTypeId: string): Promise<Array<{ id: string; name: string; sessions: number; price: number; validityDays: number }>> {
    const plans = await MembershipPlanModel.find({ classTypeId, isActive: true });
    return toApiList<MembershipPlan>(plans).map((p) => ({
      id: p.id,
      name: p.name,
      sessions: p.sessionsTotal,
      price: p.price,
      validityDays: p.validityDays,
    }));
  }

  async getScheduleForBranchAndDate(
    branch: string,
    dateStr: string
  ): Promise<Array<{ scheduleId: string; sessionDate: string; classId: string; category: string; branch: string; startTime: string; endTime: string; capacity: number }>> {
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
    return { ...s, category, classId: slug(category) };
  }

  async createScheduleSlot(item: InsertScheduleSlot): Promise<ScheduleSlot> {
    const doc = await ScheduleSlotModel.create(item);
    return toApi<ScheduleSlot>(doc)!;
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
    data: Partial<Pick<ScheduleSlot, "branch" | "dayOfWeek" | "startHour" | "startMinute" | "endHour" | "endMinute" | "capacity" | "isActive" | "notes">>
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

  async createBooking(booking: InsertBooking): Promise<BookingRecord> {
    const doc = await BookingModel.create(booking);
    return toApi<BookingRecord>(doc)!;
  }

  async updateBookingStatus(id: string, status: string, waitlistPosition?: number): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (waitlistPosition !== undefined) update.waitlistPosition = waitlistPosition;
    await BookingModel.updateOne({ _id: id }, { $set: update });
  }

  async createWaiver(waiver: InsertWaiver): Promise<void> {
    await WaiverSignatureModel.create(waiver);
  }

  async createKidDetail(detail: InsertKidDetail): Promise<void> {
    await KidDetailModel.create(detail);
  }

  async getAppSetting(key: string): Promise<string | null> {
    const doc = await AppSettingModel.findById(key);
    return doc?.value ?? null;
  }
}

export const storage = new MongoStorage();
