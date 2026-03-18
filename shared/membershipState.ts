export type MembershipUsabilityState = "active" | "expired_extendable" | "renew_only";

export type MembershipRenewOnlyReason = "expired" | "no_sessions" | "defensive_negative";

export type MembershipStateInput = {
  expiryDate: string | Date;
  sessionsRemaining: number;
  extensionApplied?: boolean | null;
};

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

export function isMembershipBookable(input: MembershipStateInput, now = new Date()): boolean {
  const expiry = toDate(input.expiryDate);
  return expiry.getTime() > now.getTime() && input.sessionsRemaining > 0;
}

export function getMembershipUsabilityState(
  input: MembershipStateInput,
  now = new Date()
):
  | { state: "active" }
  | { state: "expired_extendable" }
  | { state: "renew_only"; reason: MembershipRenewOnlyReason } {
  const expiry = toDate(input.expiryDate);
  const sessions = input.sessionsRemaining;

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

