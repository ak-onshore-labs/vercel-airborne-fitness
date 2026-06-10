export const TRIAL_ENROLL_PARAM_KEYS = [
  "mode",
  "classTypeId",
  "category",
  "scheduleId",
  "sessionDate",
  "branch",
] as const;

export type TrialBranch = "Lower Parel" | "Mazgaon";

export type ParsedTrialParams = {
  classTypeId: string;
  category: string;
  scheduleId: string;
  sessionDate: string;
  branch: TrialBranch;
};

export type TrialParamsError = {
  ok: false;
  message: string;
};

export type ParseTrialParamsResult =
  | ({ ok: true } & ParsedTrialParams)
  | TrialParamsError;

const SESSION_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_BRANCHES: TrialBranch[] = ["Lower Parel", "Mazgaon"];

function isTrialBranch(value: string): value is TrialBranch {
  return VALID_BRANCHES.includes(value as TrialBranch);
}

export function parseTrialParams(search: string): ParseTrialParamsResult {
  const qs = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const classTypeId = qs.get("classTypeId")?.trim() ?? "";
  const category = qs.get("category")?.trim() ?? "";
  const scheduleId = qs.get("scheduleId")?.trim() ?? "";
  const sessionDate = qs.get("sessionDate")?.trim() ?? "";
  const branchRaw = qs.get("branch")?.trim() ?? "";

  if (!classTypeId || !category || !scheduleId || !sessionDate || !branchRaw) {
    return {
      ok: false,
      message: "This trial link is incomplete or invalid.",
    };
  }

  if (!SESSION_DATE_RE.test(sessionDate)) {
    return {
      ok: false,
      message: "This trial link is incomplete or invalid.",
    };
  }

  if (!isTrialBranch(branchRaw)) {
    return {
      ok: false,
      message: "This trial link is incomplete or invalid.",
    };
  }

  return {
    ok: true,
    classTypeId,
    category,
    scheduleId,
    sessionDate,
    branch: branchRaw,
  };
}
