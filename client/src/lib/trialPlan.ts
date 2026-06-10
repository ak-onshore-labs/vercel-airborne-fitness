export type TrialPlan = {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validityDays?: number;
  gstInclusive?: boolean;
};

const EXACT_WALK_IN_TRIAL = "walk in trial";

export function normalizePlanName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[\/&]+/g, " ")
    .replace(/\s+/g, " ");
}

function isWalkInTrialName(normalized: string): boolean {
  if (normalized === EXACT_WALK_IN_TRIAL) return true;
  const hasWalkin = /\bwalk\s*in\b/.test(normalized) || /\bwalkin\b/.test(normalized);
  const hasTrial = /\btrial\b/.test(normalized);
  return hasWalkin && hasTrial;
}

function isWalkInTrialCandidate(plan: TrialPlan): boolean {
  if (plan.sessions !== 1) return false;
  return isWalkInTrialName(normalizePlanName(plan.name));
}

/** Prefer exact normalized "walk in trial" match; otherwise first 1-session walk-in/trial variant. */
export function findWalkInTrialPlan(plans: TrialPlan[]): TrialPlan | null {
  const candidates = plans.filter(isWalkInTrialCandidate);
  if (candidates.length === 0) return null;

  const exact = candidates.find((p) => normalizePlanName(p.name) === EXACT_WALK_IN_TRIAL);
  return exact ?? candidates[0];
}
