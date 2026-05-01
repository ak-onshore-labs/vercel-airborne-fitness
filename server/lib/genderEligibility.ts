import type { ScheduleGenderRestriction } from "../../shared/schema.js";
import { storage } from "../storage.js";

export type ResolvedGender = "FEMALE" | "MALE" | "OTHER_OR_UNKNOWN";

export function normalizeGenderForRestriction(value: unknown): ResolvedGender {
  if (typeof value !== "string") return "OTHER_OR_UNKNOWN";
  const normalized = value.trim().toLowerCase();
  if (normalized === "female") return "FEMALE";
  if (normalized === "male") return "MALE";
  return "OTHER_OR_UNKNOWN";
}

export function isEligibleForGenderRestriction(
  genderRestriction: ScheduleGenderRestriction | undefined,
  resolvedGender: ResolvedGender
): boolean {
  if (genderRestriction !== "FEMALE_ONLY") return true;
  return resolvedGender === "FEMALE";
}

export async function resolveMemberGenderForRestriction(memberId: string): Promise<ResolvedGender> {
  const member = await storage.getMember(memberId);
  if (!member) return "OTHER_OR_UNKNOWN";

  if (member.memberType === "Kid") {
    return normalizeGenderForRestriction(member.gender ?? null);
  }

  const user = await storage.getUser(member.userId);
  return normalizeGenderForRestriction(user?.gender ?? null);
}
