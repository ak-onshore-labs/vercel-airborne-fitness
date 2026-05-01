export const GST_PERCENT = 5;

export interface PlanPricingInput {
  price: number;
  gstInclusive?: boolean | null;
}

export interface PlanPricingBreakdown {
  subtotalInr: number;
  gstInr: number;
  totalInr: number;
}

export interface CartPricingBreakdown extends PlanPricingBreakdown {
  totalPaise: number;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computePlanPricing(input: PlanPricingInput): PlanPricingBreakdown {
  const subtotalInr = Number.isFinite(input.price) ? input.price : 0;
  const gstInr = input.gstInclusive === true ? 0 : subtotalInr * (GST_PERCENT / 100);
  const totalInr = subtotalInr + gstInr;
  return {
    subtotalInr: roundTo2(subtotalInr),
    gstInr: roundTo2(gstInr),
    totalInr: roundTo2(totalInr),
  };
}

export function computeCartPricing(inputs: PlanPricingInput[]): CartPricingBreakdown {
  const totals = inputs.reduce(
    (acc, item) => {
      const row = computePlanPricing(item);
      acc.subtotalInr += row.subtotalInr;
      acc.gstInr += row.gstInr;
      acc.totalInr += row.totalInr;
      return acc;
    },
    { subtotalInr: 0, gstInr: 0, totalInr: 0 }
  );

  const subtotalInr = roundTo2(totals.subtotalInr);
  const gstInr = roundTo2(totals.gstInr);
  const totalInr = roundTo2(totals.totalInr);
  return {
    subtotalInr,
    gstInr,
    totalInr,
    totalPaise: Math.round(totalInr * 100),
  };
}
