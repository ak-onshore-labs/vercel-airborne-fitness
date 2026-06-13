/**
 * Home page "Current Offers" content (V1, frontend-only).
 *
 * Card fields (title, subtitle, discountLabel) are teaser copy only.
 * Modal-only fields (modalIntro, modalSlabs) must never be rendered on cards.
 *
 * To hide an offer without deleting it, set `isActive: false`.
 */

export type HomeOfferKind = "long_term" | "combination";

export interface HomeOfferModalSlab {
  /** Marketing label shown in modal (e.g. "Half-Yearly"). */
  label: string;
  percentOff: number;
}

export interface HomeOffer {
  /** Stable key for React lists. */
  id: string;
  kind: HomeOfferKind;
  /** Headline of the offer card. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Short, tasteful discount label shown as a teal badge on the card. */
  discountLabel: string;
  /** Card call-to-action label (opens detail sheet). */
  cardCtaLabel: string;
  /** Optional explanatory copy shown only in the detail sheet. */
  modalIntro?: string;
  /** Combination offer slabs — modal only, never rendered on the card. */
  modalSlabs?: HomeOfferModalSlab[];
  /** Detail sheet primary CTA label. */
  enrollCtaLabel: string;
  /** Where the sheet enroll CTA navigates. Set to `null` to disable. */
  enrollRoute: string | null;
  /** Toggle visibility without removing the entry. */
  isActive: boolean;
}

export const HOME_OFFERS: HomeOffer[] = [
  {
    id: "long-term-10",
    kind: "long_term",
    title: "Save 10% on long-term memberships",
    subtitle: "Available on Half-Yearly and Yearly plans.",
    discountLabel: "10% off",
    cardCtaLabel: "Know More",
    modalIntro:
      "Save 10% when you choose a Half-Yearly or Yearly membership for any class type.",
    enrollCtaLabel: "Explore memberships",
    enrollRoute: "/enroll",
    isActive: true,
  },
  {
    id: "two-plans-together",
    kind: "combination",
    title: "Unlock more value with multiple classes",
    subtitle:
      "Choose 2 or more class types together and unlock additional membership benefits.",
    discountLabel: "Multi-class offer",
    cardCtaLabel: "Know More",
    modalIntro:
      "When you enroll in 2 or more different class types together, your combination discount depends on the plan duration you choose:",
    modalSlabs: [
      { label: "Monthly", percentOff: 5 },
      { label: "Quarterly", percentOff: 10 },
      { label: "Half-Yearly", percentOff: 15 },
      { label: "Yearly", percentOff: 20 },
    ],
    enrollCtaLabel: "Explore memberships",
    enrollRoute: "/enroll",
    isActive: true,
  },
];

/** Active offers only, in display order. */
export function getActiveHomeOffers(): HomeOffer[] {
  return HOME_OFFERS.filter((o) => o.isActive);
}
