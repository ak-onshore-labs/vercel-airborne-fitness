import { getMembershipUsabilityState } from "@shared/membershipState";
import type { MembershipDetails } from "@/context/MemberContext";

export function getRenewUrl(categoryName: string): string {
  return `/enroll?renew=1&category=${encodeURIComponent(categoryName)}`;
}

export function getMembershipHeadline(details: MembershipDetails, now = new Date()): string | null {
  const s = getMembershipUsabilityState(
    {
      expiryDate: details.expiryDate,
      sessionsRemaining: details.sessionsRemaining,
      extensionApplied: details.extensionApplied,
    },
    now
  );

  if (s.state === "active") return null;
  if (s.state === "expired_extendable") return "Your membership has expired";
  if (s.reason === "expired") return "Your membership has expired";
  return "No sessions remaining";
}

export function getMembershipCtas(details: MembershipDetails, now = new Date()): {
  showBook: boolean;
  showRenew: boolean;
  showExtend: boolean;
} {
  const s = getMembershipUsabilityState(
    {
      expiryDate: details.expiryDate,
      sessionsRemaining: details.sessionsRemaining,
      extensionApplied: details.extensionApplied,
    },
    now
  );

  if (s.state === "active") return { showBook: true, showRenew: false, showExtend: false };
  if (s.state === "expired_extendable") return { showBook: false, showRenew: true, showExtend: true };
  return { showBook: false, showRenew: true, showExtend: false };
}

export function isMembershipActive(details: MembershipDetails, now = new Date()): boolean {
  const s = getMembershipUsabilityState(
    {
      expiryDate: details.expiryDate,
      sessionsRemaining: details.sessionsRemaining,
      extensionApplied: details.extensionApplied,
    },
    now
  );
  return s.state === "active";
}

