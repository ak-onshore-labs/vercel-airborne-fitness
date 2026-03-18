import { getMembershipUsabilityState } from "@shared/membershipState";
import type { MembershipDetails } from "@/context/MemberContext";
import { format } from "date-fns";

export function getRenewUrl(categoryName: string): string {
  return `/enroll?renew=1&category=${encodeURIComponent(categoryName)}`;
}

export function getMembershipHeadline(details: MembershipDetails, now = new Date()): string | null {
  const s = getMembershipUsabilityState(
    {
      expiryDate: details.expiryDate,
      sessionsRemaining: details.sessionsRemaining,
      extensionApplied: details.extensionApplied,
      pauseUsed: details.pauseUsed,
      pauseStart: details.pauseStart ?? null,
      pauseEnd: details.pauseEnd ?? null,
    },
    now
  );

  if (s.state === "active") return null;
  if (s.state === "paused") {
    const resume = details.pauseEnd ? format(new Date(details.pauseEnd), "dd MMM yyyy") : "soon";
    return `Membership paused — resumes on ${resume}`;
  }
  if (s.state === "expired_extendable") return "Your membership has expired";
  if (s.reason === "expired") return "Your membership has expired";
  return "No sessions remaining";
}

export function getMembershipUsability(details: MembershipDetails, now = new Date()) {
  return getMembershipUsabilityState(
    {
      expiryDate: details.expiryDate,
      sessionsRemaining: details.sessionsRemaining,
      extensionApplied: details.extensionApplied,
      pauseUsed: details.pauseUsed,
      pauseStart: details.pauseStart ?? null,
      pauseEnd: details.pauseEnd ?? null,
    },
    now
  );
}

export function getMembershipCtas(details: MembershipDetails, now = new Date()): {
  showBook: boolean;
  showRenew: boolean;
  showExtend: boolean;
} {
  const s = getMembershipUsability(details, now);

  if (s.state === "active") return { showBook: true, showRenew: false, showExtend: false };
  if (s.state === "paused") return { showBook: false, showRenew: false, showExtend: false };
  if (s.state === "expired_extendable") return { showBook: false, showRenew: true, showExtend: true };
  return { showBook: false, showRenew: true, showExtend: false };
}

export function isMembershipActive(details: MembershipDetails, now = new Date()): boolean {
  const s = getMembershipUsability(details, now);
  return s.state === "active";
}

export function isPauseCtaVisible(details: MembershipDetails, now = new Date()): boolean {
  const s = getMembershipUsability(details, now);
  const validityDays = typeof details.validityDays === "number" ? details.validityDays : null;
  return (
    s.state === "active" &&
    details.sessionsRemaining > 0 &&
    details.pauseUsed !== true &&
    validityDays !== null &&
    validityDays >= 180
  );
}

