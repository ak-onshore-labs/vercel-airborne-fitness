import { MembershipPlanModel } from "../models/index.js";
import { storage } from "../storage.js";
import {
  getMembershipUsabilityState,
  membershipStateTierRank,
} from "../../shared/membershipState.js";

export type EnrollMembershipMapEntry = {
  id: string;
  sessionsRemaining: number;
  expiryDate: string;
  extensionApplied: boolean;
  planName?: string;
  pauseUsed: boolean;
  pauseStart: string | null;
  pauseEnd: string | null;
  validityDays?: number;
  startDate: string | null;
};

export type EnrollMembershipMap = Record<string, EnrollMembershipMapEntry>;

export function parseMembershipIds(metadata: Record<string, unknown> | null | undefined): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = metadata.membershipIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

/** Enrollment recorded when both enrolledAt and at least one membershipId are present. */
export function isEnrollmentComplete(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const enrolledAt = metadata.enrolledAt;
  if (typeof enrolledAt !== "string" || enrolledAt.trim().length === 0) return false;
  return parseMembershipIds(metadata).length > 0;
}

/** enrolledAt without membershipIds — unsafe to create or replay. */
export function hasAmbiguousEnrollment(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const enrolledAt = metadata.enrolledAt;
  if (typeof enrolledAt !== "string" || enrolledAt.trim().length === 0) return false;
  return parseMembershipIds(metadata).length === 0;
}

export function metadataMemberId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.memberId;
  if (typeof raw !== "string" || raw.trim().length === 0) return null;
  return raw.trim();
}

/** Verify metadata membershipIds exist and belong to memberId. */
export async function validateEnrollmentMembershipIds(
  membershipIds: string[],
  memberId: string
): Promise<boolean> {
  for (const id of membershipIds) {
    const m = await storage.getMembershipById(id);
    if (!m || m.memberId !== memberId) return false;
  }
  return true;
}

export async function buildMembershipMapForMember(memberId: string): Promise<EnrollMembershipMap> {
  const allMemberships = await storage.getMemberMemberships(memberId);
  const planDocs = await MembershipPlanModel.find({});
  const planById = new Map(planDocs.map((p: { _id: unknown; classTypeId?: string; name?: string; validityDays?: number }) => [
    String(p._id),
    p,
  ]));
  const typeList = await storage.getClassTypes();
  const typeIdToName: Record<string, string> = {};
  for (const t of typeList) {
    typeIdToName[t.id] = t.name;
  }

  const membershipMap: EnrollMembershipMap = {};
  const now = new Date();

  function tierRank(x: {
    expiryDate: string;
    sessionsRemaining: number;
    extensionApplied: boolean;
    pauseUsed?: boolean | null;
    pauseStart?: string | null;
    pauseEnd?: string | null;
    startDate?: string | null;
  }): number {
    const state = getMembershipUsabilityState(
      {
        expiryDate: x.expiryDate,
        sessionsRemaining: x.sessionsRemaining,
        extensionApplied: x.extensionApplied,
        pauseUsed: x.pauseUsed,
        pauseStart: x.pauseStart,
        pauseEnd: x.pauseEnd,
        startDate: x.startDate ?? null,
      },
      now
    ).state;
    return membershipStateTierRank(state);
  }

  function isCandidateBetter(
    candidate: EnrollMembershipMapEntry,
    existing: EnrollMembershipMapEntry
  ): boolean {
    const ra = tierRank(candidate);
    const rb = tierRank(existing);
    if (ra !== rb) return ra < rb;
    const expA = new Date(candidate.expiryDate).getTime();
    const expB = new Date(existing.expiryDate).getTime();
    if (expA !== expB) return expA < expB;
    return String(candidate.id).localeCompare(String(existing.id), "en") < 0;
  }

  for (const m of allMemberships) {
    const plan = planById.get(m.membershipPlanId);
    const classTypeId = plan?.classTypeId ?? "";
    const category = typeIdToName[classTypeId] ?? m.membershipPlanId;
    const candidate: EnrollMembershipMapEntry = {
      id: m.id,
      sessionsRemaining: m.sessionsRemaining,
      expiryDate: m.expiryDate instanceof Date ? m.expiryDate.toISOString() : String(m.expiryDate),
      extensionApplied: Boolean((m as { extensionApplied?: boolean }).extensionApplied),
      planName: plan?.name,
      pauseUsed: Boolean((m as { pauseUsed?: boolean }).pauseUsed),
      pauseStart: (m as { pauseStart?: Date | null }).pauseStart
        ? new Date((m as { pauseStart: Date }).pauseStart).toISOString()
        : null,
      pauseEnd: (m as { pauseEnd?: Date | null }).pauseEnd
        ? new Date((m as { pauseEnd: Date }).pauseEnd).toISOString()
        : null,
      validityDays: typeof plan?.validityDays === "number" ? plan.validityDays : undefined,
      startDate: (m as { startDate?: Date | null }).startDate
        ? new Date((m as { startDate: Date }).startDate).toISOString()
        : null,
    };
    const existing = membershipMap[category];
    if (!existing) {
      membershipMap[category] = candidate;
      continue;
    }
    if (isCandidateBetter(candidate, existing)) {
      membershipMap[category] = candidate;
    }
  }

  return membershipMap;
}
