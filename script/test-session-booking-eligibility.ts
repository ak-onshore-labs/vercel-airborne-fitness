/**
 * Smoke tests for getMembershipSessionBookingEligibility. Run: npx tsx script/test-session-booking-eligibility.ts
 */
import assert from "node:assert/strict";
import {
  getMembershipSessionBookingEligibility,
  membershipSessionStartInstant,
} from "../shared/membershipState.js";
import { computeMembershipExpiryExclusiveEnd } from "../shared/membershipDates.js";

function baseInput(overrides: Partial<Parameters<typeof getMembershipSessionBookingEligibility>[0]> = {}) {
  const startDay = "2026-05-10";
  const expiry = computeMembershipExpiryExclusiveEnd(startDay, 30);
  return {
    expiryDate: expiry,
    sessionsRemaining: 8,
    extensionApplied: false,
    pauseUsed: false,
    pauseStart: null,
    pauseEnd: null,
    startDate: `${startDay}T00:00:00+05:30`,
    ...overrides,
  };
}

const may6 = new Date("2026-05-06T12:00:00+05:30");
const startDay = "2026-05-10";
const expiry = computeMembershipExpiryExclusiveEnd(startDay, 30);
const input = baseInput();

let r = getMembershipSessionBookingEligibility(input, "2026-05-09", 10, 0, { now: may6 });
assert.equal(r.ok, false);
assert.equal((r as { ok: false }).reason, "before_start");

r = getMembershipSessionBookingEligibility(input, "2026-05-10", 10, 0, { now: may6 });
assert.equal(r.ok, true);

r = getMembershipSessionBookingEligibility(input, "2026-05-11", 18, 30, { now: may6 });
assert.equal(r.ok, true);

r = getMembershipSessionBookingEligibility(input, "2026-05-09", 10, 0, {
  now: may6,
  mode: "refund_pick",
  requirePositiveSessions: false,
});
assert.equal(r.ok, false);
assert.equal((r as { ok: false }).reason, "before_start");

r = getMembershipSessionBookingEligibility(input, "2026-05-10", 10, 0, {
  now: may6,
  mode: "refund_pick",
  requirePositiveSessions: false,
});
assert.equal(r.ok, true);

r = getMembershipSessionBookingEligibility(input, "2026-06-20", 10, 0, { now: may6 });
assert.equal(r.ok, false);
assert.equal((r as { ok: false }).reason, "after_expiry");

r = getMembershipSessionBookingEligibility({ ...input, sessionsRemaining: 0 }, "2026-05-10", 10, 0, { now: may6 });
assert.equal(r.ok, false);
assert.equal((r as { ok: false }).reason, "no_sessions");

const pauseStart = new Date("2026-05-05T00:00:00+05:30");
const pauseEnd = new Date("2026-05-20T23:59:59+05:30");
r = getMembershipSessionBookingEligibility(
  { ...input, pauseUsed: true, pauseStart, pauseEnd },
  "2026-05-10",
  10,
  0,
  { now: may6 }
);
assert.equal(r.ok, false);
assert.equal((r as { ok: false }).reason, "paused");

r = getMembershipSessionBookingEligibility(
  { ...input, pauseUsed: true, pauseStart, pauseEnd },
  "2026-05-10",
  10,
  0,
  { now: may6, mode: "refund_pick", requirePositiveSessions: false }
);
assert.equal(r.ok, true);

const lastSessionStart = membershipSessionStartInstant("2026-06-08", 20, 0);
assert.ok(lastSessionStart.getTime() < expiry.getTime());
r = getMembershipSessionBookingEligibility(input, "2026-06-08", 20, 0, { now: may6 });
assert.equal(r.ok, true);

const shortStart = "2026-05-01";
const shortExp = computeMembershipExpiryExclusiveEnd(shortStart, 10);
const expiredExtInput = {
  expiryDate: shortExp,
  sessionsRemaining: 2,
  extensionApplied: false,
  pauseUsed: false,
  pauseStart: null,
  pauseEnd: null,
  startDate: `${shortStart}T00:00:00+05:30`,
};
const nowAfterShort = new Date("2026-05-25T12:00:00+05:30");
r = getMembershipSessionBookingEligibility(expiredExtInput, "2026-05-05", 10, 0, { now: nowAfterShort });
assert.equal(r.ok, false);
assert.equal((r as { ok: false }).reason, "not_bookable");

console.log("getMembershipSessionBookingEligibility: all assertions passed");
