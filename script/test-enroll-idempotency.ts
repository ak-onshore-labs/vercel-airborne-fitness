/**
 * Unit tests for enroll idempotency helpers (no DB required).
 * Run: npx tsx script/test-enroll-idempotency.ts
 */
import {
  hasAmbiguousEnrollment,
  isEnrollmentComplete,
  parseMembershipIds,
} from "../server/lib/enrollIdempotency.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(parseMembershipIds(null).length === 0, "null metadata → empty ids");
assert(parseMembershipIds({ membershipIds: ["a", "b"] }).join() === "a,b", "parse ids");
assert(
  isEnrollmentComplete({ enrolledAt: "2026-01-01T00:00:00.000Z", membershipIds: ["m1"] }),
  "complete when enrolledAt + ids"
);
assert(
  !isEnrollmentComplete({ enrolledAt: "2026-01-01T00:00:00.000Z" }),
  "incomplete without membershipIds"
);
assert(
  !isEnrollmentComplete({ membershipIds: ["m1"] }),
  "incomplete without enrolledAt"
);
assert(
  hasAmbiguousEnrollment({ enrolledAt: "2026-01-01T00:00:00.000Z" }),
  "ambiguous when enrolledAt only"
);
assert(
  !hasAmbiguousEnrollment({ enrolledAt: "2026-01-01T00:00:00.000Z", membershipIds: ["m1"] }),
  "not ambiguous when complete"
);

console.log("test-enroll-idempotency: all assertions passed");
