import type { ScheduleGenderRestriction } from "@shared/schema";

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
  userGender: unknown
): boolean {
  if (genderRestriction !== "FEMALE_ONLY") return true;
  return normalizeGenderForRestriction(userGender) === "FEMALE";
}
