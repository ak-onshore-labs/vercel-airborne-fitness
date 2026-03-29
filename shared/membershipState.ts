import { isBeforeMembershipStartDay } from "./membershipDates";

export type MembershipUsabilityState = "active" | "paused" | "upcoming" | "expired_extendable" | "renew_only";

export type MembershipRenewOnlyReason = "expired" | "no_sessions" | "defensive_negative";

export type MembershipStateInput = {
  expiryDate: string | Date;
  sessionsRemaining: number;
  extensionApplied?: boolean | null;
  pauseUsed?: boolean | null;
  pauseStart?: string | Date | null;
  pauseEnd?: string | Date | null;
  /** When set, membership is not usable until this calendar day (IST) is reached. */
  startDate?: string | Date | null;
};

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

export function isMembershipBookable(input: MembershipStateInput, now = new Date()): boolean {
  return getMembershipUsabilityState(input, now).state === "active";
}

export function getMembershipUsabilityState(
  input: MembershipStateInput,
  now = new Date()
):
  | { state: "active" }
  | { state: "paused" }
  | { state: "upcoming" }
  | { state: "expired_extendable" }
  | { state: "renew_only"; reason: MembershipRenewOnlyReason } {
  const expiry = toDate(input.expiryDate);
  const sessions = input.sessionsRemaining;

  const pauseUsed = input.pauseUsed === true;
  const pauseStart = input.pauseStart ? toDate(input.pauseStart) : null;
  const pauseEnd = input.pauseEnd ? toDate(input.pauseEnd) : null;
  if (pauseUsed && pauseStart && pauseEnd) {
    const nowMs = now.getTime();
    if (nowMs >= pauseStart.getTime() && nowMs <= pauseEnd.getTime()) {
      return { state: "paused" };
    }
  }

  if (isBeforeMembershipStartDay(input.startDate ?? null, now)) {
    return { state: "upcoming" };
  }

  if (expiry.getTime() > now.getTime() && sessions > 0) {
    return { state: "active" };
  }

  if (sessions < 0) {
    return { state: "renew_only", reason: "defensive_negative" };
  }

  if (sessions <= 0) {
    return { state: "renew_only", reason: "no_sessions" };
  }

  const extensionApplied = input.extensionApplied === true;
  if (expiry.getTime() <= now.getTime() && sessions > 0 && !extensionApplied) {
    return { state: "expired_extendable" };
  }

  return { state: "renew_only", reason: "expired" };
}

/** Lower is better for picking the “primary” membership per category (auth / enroll maps). */
export function membershipStateTierRank(state: MembershipUsabilityState): number {
  if (state === "active") return 0;
  if (state === "upcoming") return 1;
  if (state === "paused") return 2;
  if (state === "expired_extendable") return 3;
  return 4;
}

