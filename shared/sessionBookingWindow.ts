import { membershipSessionStartInstant } from "./membershipState.js";

export const MEMBER_BOOKING_CUTOFF_MINUTES = 5;

export function parseSessionStartTime(startTime: string): { hour: number; minute: number } | null {
  const [hRaw, mRaw] = startTime.split(":");
  const hour = parseInt(hRaw, 10);
  const minute = parseInt(mRaw, 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

/** Session is bookable until 5 minutes after start. Matches backend rule. */
export function isSessionWithinBookingWindow(
  sessionDate: string,
  startTime: string,
  now: Date = new Date()
): boolean {
  const parsed = parseSessionStartTime(startTime);
  if (!parsed) return false;
  const sessionStart = membershipSessionStartInstant(sessionDate, parsed.hour, parsed.minute);
  const cutoffMs = sessionStart.getTime() + MEMBER_BOOKING_CUTOFF_MINUTES * 60 * 1000;
  return now.getTime() <= cutoffMs;
}
