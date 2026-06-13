import type { ScheduleGenderRestriction } from "@shared/schema";
import { isSessionWithinBookingWindow } from "@shared/sessionBookingWindow";
import { isEligibleForGenderRestriction } from "@/lib/genderEligibility";

export type TrialSessionEligibilityInput = {
  sessionDate: string;
  startTime: string;
  capacity: number;
  genderRestriction?: ScheduleGenderRestriction;
  bookedCount: number;
  userGender: unknown;
  now?: Date;
};

export type TrialSessionEligibilityResult =
  | { ok: true }
  | { ok: false; reason: "window_closed" | "full" | "gender_restricted" };

export function getTrialSessionEligibility(
  input: TrialSessionEligibilityInput
): TrialSessionEligibilityResult {
  const now = input.now ?? new Date();

  if (!isSessionWithinBookingWindow(input.sessionDate, input.startTime, now)) {
    return { ok: false, reason: "window_closed" };
  }

  if (input.bookedCount >= input.capacity) {
    return { ok: false, reason: "full" };
  }

  if (!isEligibleForGenderRestriction(input.genderRestriction, input.userGender)) {
    return { ok: false, reason: "gender_restricted" };
  }

  return { ok: true };
}
