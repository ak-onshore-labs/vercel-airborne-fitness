/**
 * Home page "Current Offers" content (V1, frontend-only).
 *
 * These are the two real, owner-confirmed offer concepts. No fake/placeholder
 * offers. There is no backend/admin CMS for offers yet — this list is the
 * single source of truth until a Phase 3 admin surface exists.
 *
 * To update an offer: edit the entries below. To hide one without deleting it,
 * set `isActive: false`. To make a CTA visual-only (no navigation), set
 * `route: null`.
 */

export interface HomeOffer {
  /** Stable key for React lists. */
  id: string;
  /** Headline of the offer card. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Optional detail rows (e.g. per-plan discounts). Rendered as a clean list. */
  details?: string[];
  /** Short, tasteful discount label shown as a teal badge. */
  discountLabel: string;
  /** Call-to-action label. */
  ctaLabel: string;
  /**
   * Where the CTA navigates. `/enroll` opens the membership flow (no plan
   * deep-link yet, per owner constraint). Set to `null` to make the CTA
   * visual-only (non-navigating) until the owner confirms behavior.
   */
  route: string | null;
  /** Toggle visibility without removing the entry. */
  isActive: boolean;
}

export const HOME_OFFERS: HomeOffer[] = [
  {
    id: "long-term-10",
    title: "Yearly & Half-Yearly Memberships",
    subtitle: "Save on long-term memberships.",
    discountLabel: "10% OFF",
    ctaLabel: "Explore memberships",
    route: "/enroll",
    isActive: true,
  },
  {
    id: "two-plans-together",
    title: "Two Plans Together",
    subtitle: "Combine plans and save more, the longer you commit.",
    details: [
      "Monthly · 5% off",
      "Quarterly · 10% off",
      "Half-Yearly · 15% off",
      "Yearly · 20% off",
    ],
    discountLabel: "Up to 20% OFF",
    ctaLabel: "Explore memberships",
    route: "/enroll",
    isActive: true,
  },
];

/** Active offers only, in display order. */
export function getActiveHomeOffers(): HomeOffer[] {
  return HOME_OFFERS.filter((o) => o.isActive);
}
