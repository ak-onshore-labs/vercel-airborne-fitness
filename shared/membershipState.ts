import { isBeforeMembershipStartDay, membershipStartDateToCalendarString } from "./membershipDates.js";

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

export type SessionBookingIneligibilityReason =
  | "paused"
  | "before_start"
  | "after_expiry"
  | "no_sessions"
  | "not_bookable";

export type SessionBookingEligibility =
  | { ok: true }
  | { ok: false; reason: SessionBookingIneligibilityReason };

export type GetMembershipSessionBookingEligibilityOptions = {
  now?: Date;
  /** When true (default), require sessionsRemaining > 0. */
  requirePositiveSessions?: boolean;
  /**
   * "book" — same as member join/book (block expired_extendable / renew_only globally).
   * "refund_pick" — pick membership to refund session credit; skips global expired/renew blocks.
   */
  mode?: "book" | "refund_pick";
};

function pad2Session(n: number): string {
  return String(n).padStart(2, "0");
}

/** Session start instant; matches server `manage-session` booking window parsing (local wall time, no Z). */
export function membershipSessionStartInstant(
  sessionDateYyyyMmDd: string,
  startHour: number,
  startMinute: number
): Date {
  return new Date(`${sessionDateYyyyMmDd}T${pad2Session(startHour)}:${pad2Session(startMinute)}:00`);
}

/**
 * Whether this membership may be used for a specific scheduled session (advance booking supported
 * while global state is still "upcoming"). Does not change `getMembershipUsabilityState`.
 */
export function getMembershipSessionBookingEligibility(
  input: MembershipStateInput,
  sessionDateYyyyMmDd: string,
  startHour: number,
  startMinute: number,
  options?: GetMembershipSessionBookingEligibilityOptions
): SessionBookingEligibility {
  const now = options?.now ?? new Date();
  const requirePositiveSessions = options?.requirePositiveSessions !== false;
  const mode = options?.mode ?? "book";

  const expiry = toDate(input.expiryDate);
  const sessions = input.sessionsRemaining;

  const pauseUsed = input.pauseUsed === true;
  const pauseStart = input.pauseStart ? toDate(input.pauseStart) : null;
  const pauseEnd = input.pauseEnd ? toDate(input.pauseEnd) : null;
  /** Booking is blocked while paused; refund pick still resolves the membership row to credit back. */
  if (mode !== "refund_pick" && pauseUsed && pauseStart && pauseEnd) {
    const nowMs = now.getTime();
    if (nowMs >= pauseStart.getTime() && nowMs <= pauseEnd.getTime()) {
      return { ok: false, reason: "paused" };
    }
  }

  if (requirePositiveSessions && sessions <= 0) {
    return { ok: false, reason: "no_sessions" };
  }

  if (mode === "book") {
    const usability = getMembershipUsabilityState(input, now);
    if (usability.state === "expired_extendable") {
      return { ok: false, reason: "not_bookable" };
    }
    if (usability.state === "renew_only") {
      return { ok: false, reason: "not_bookable" };
    }
  }

  const sd = sessionDateYyyyMmDd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sd)) {
    return { ok: false, reason: "not_bookable" };
  }

  const startDate = input.startDate ?? null;
  if (startDate != null) {
    const startStr = membershipStartDateToCalendarString(startDate);
    if (sd < startStr) {
      return { ok: false, reason: "before_start" };
    }
  }

  const sessionStart = membershipSessionStartInstant(sd, startHour, startMinute);
  if (Number.isNaN(sessionStart.getTime())) {
    return { ok: false, reason: "not_bookable" };
  }
  if (sessionStart.getTime() >= expiry.getTime()) {
    return { ok: false, reason: "after_expiry" };
  }

  return { ok: true };
}

