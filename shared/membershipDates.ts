import { addDays } from "date-fns";

/** Single timezone for membership calendar rules (branches in India). */
export const MEMBERSHIP_BUSINESS_TIMEZONE = "Asia/Kolkata";

/** YYYY-MM-DD for the given instant in IST. */
export function calendarDateInIST(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: MEMBERSHIP_BUSINESS_TIMEZONE });
}

/** Normalize stored startDate to YYYY-MM-DD (IST calendar). */
export function membershipStartDateToCalendarString(startDate: string | Date): string {
  if (typeof startDate === "string") {
    const m = startDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  return calendarDateInIST(startDate instanceof Date ? startDate : new Date(startDate));
}

/** True when `now` is strictly before the membership's first valid calendar day (IST). */
export function isBeforeMembershipStartDay(
  startDate: string | Date | null | undefined,
  now: Date
): boolean {
  if (startDate == null) return false;
  const startStr = membershipStartDateToCalendarString(startDate);
  const todayStr = calendarDateInIST(now);
  return todayStr < startStr;
}

/** Parse `YYYY-MM-DD` from enroll input to a Date at start of that day in IST. */
export function parseMembershipStartDateFromInput(yyyyMmDd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd.trim())) {
    throw new Error("Invalid membership start date");
  }
  return new Date(`${yyyyMmDd.trim()}T00:00:00+05:30`);
}

/**
 * Exclusive expiry instant: first moment the membership is no longer valid.
 * Validity runs from start (inclusive) for `validityDays` full calendar days; expires at 00:00 IST on the following day.
 */
export function computeMembershipExpiryExclusiveEnd(startDateYyyyMmDd: string, validityDays: number): Date {
  const start = parseMembershipStartDateFromInput(startDateYyyyMmDd);
  return addDays(start, validityDays);
}

/** Min/max allowed calendar start dates (IST) for enrollment: today .. today+28d. */
export function membershipEnrollmentStartBounds(now: Date): { min: string; max: string } {
  const min = calendarDateInIST(now);
  const max = addCalendarDaysIST(min, 28);
  return { min, max };
}

function addCalendarDaysIST(yyyyMmDd: string, days: number): string {
  const base = new Date(`${yyyyMmDd}T12:00:00+05:30`);
  const end = addDays(base, days);
  return calendarDateInIST(end);
}
