import { apiFetch } from "@/lib/api";

export const LONG_TERM_DISCOUNT_PERCENT = 10;

export const LONG_TERM_ELIGIBLE_PLAN_NAMES = ["Six Monthly", "Yearly"] as const;

export const LONG_TERM_PLAN_DISPLAY_NAMES: Record<string, string> = {
  "Six Monthly": "Half-Yearly",
  Yearly: "Yearly",
};

/** Plan order within each class section. */
const LONG_TERM_PLAN_SORT_ORDER = ["Six Monthly", "Yearly"];

export interface GroupedPlan {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validityDays: number;
  gstInclusive: boolean;
}

export type GroupedPlans = Record<string, GroupedPlan[]>;

export interface LongTermPlanDisplayRow {
  className: string;
  planDbName: string;
  planLabel: string;
  originalPrice: number;
  discountedPrice: number;
  savings: number;
}

export interface LongTermDisplaySection {
  className: string;
  rows: LongTermPlanDisplayRow[];
}

let cachedGroupedPlans: GroupedPlans | null = null;

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function applyLongTermDisplayDiscount(price: number): {
  discountedPrice: number;
  savings: number;
} {
  const discountedPrice = Math.round(
    price * (1 - LONG_TERM_DISCOUNT_PERCENT / 100),
  );
  return { discountedPrice, savings: price - discountedPrice };
}

export function buildLongTermDisplaySections(
  grouped: GroupedPlans,
): LongTermDisplaySection[] {
  const classNames = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b, "en"),
  );

  const sections: LongTermDisplaySection[] = [];

  for (const className of classNames) {
    const plans = grouped[className] ?? [];
    const eligible = plans
      .filter((p) =>
        (LONG_TERM_ELIGIBLE_PLAN_NAMES as readonly string[]).includes(p.name),
      )
      .sort(
        (a, b) =>
          LONG_TERM_PLAN_SORT_ORDER.indexOf(a.name) -
          LONG_TERM_PLAN_SORT_ORDER.indexOf(b.name),
      );

    if (eligible.length === 0) continue;

    sections.push({
      className,
      rows: eligible.map((plan) => {
        const { discountedPrice, savings } = applyLongTermDisplayDiscount(
          plan.price,
        );
        return {
          className,
          planDbName: plan.name,
          planLabel: LONG_TERM_PLAN_DISPLAY_NAMES[plan.name] ?? plan.name,
          originalPrice: plan.price,
          discountedPrice,
          savings,
        };
      }),
    });
  }

  return sections;
}

export async function fetchGroupedPlans(): Promise<{
  ok: true;
  data: GroupedPlans;
} | {
  ok: false;
  message: string;
}> {
  if (cachedGroupedPlans) {
    return { ok: true, data: cachedGroupedPlans };
  }

  const result = await apiFetch<GroupedPlans>("/api/plans");
  if (!result.ok || !result.data) {
    return {
      ok: false,
      message: result.ok ? "Invalid response" : result.message,
    };
  }

  cachedGroupedPlans = result.data;
  return { ok: true, data: result.data };
}

/** Clears session cache (useful if plan prices change during dev). */
export function clearGroupedPlansCache(): void {
  cachedGroupedPlans = null;
}
