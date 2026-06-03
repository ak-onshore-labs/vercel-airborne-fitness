import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAutoRotateCarousel } from "@/hooks/useAutoRotateCarousel";
import type { HomeOffer } from "@/lib/homeOffers";

interface HomeOffersCarouselProps {
  offers: HomeOffer[];
}

/**
 * Horizontal, snap-scrolling row of premium offer cards. Renders nothing when
 * there are no active offers. Mobile-first (touch swipe + scroll snap) and
 * gently auto-rotating (~2.4s, disabled under reduced motion).
 */
export function HomeOffersCarousel({ offers }: HomeOffersCarouselProps) {
  const [, setLocation] = useLocation();
  const rowRef = useAutoRotateCarousel<HTMLDivElement>(offers.length, 2400);

  if (offers.length === 0) return null;

  return (
    <section aria-label="Current offers">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-[#EDEDED]">
          Current Offers
        </h2>
      </div>

      <div
        ref={rowRef}
        className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 scroll-pl-6 scrollbar-hide touch-pan-x overscroll-x-contain"
        role="list"
      >
        {offers.map((offer) => (
          <article
            key={offer.id}
            role="listitem"
            data-testid={`card-offer-${offer.id}`}
            className="relative flex w-[85%] max-w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10 bg-gradient-to-br from-white to-teal-50/60 dark:from-[#111113] dark:to-[#0c1f20] p-5 shadow-sm dark:shadow-black/30"
          >
            <div
              className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-airborne-teal to-airborne-deep"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-airborne-teal/10 blur-2xl"
              aria-hidden
            />

            <div className="mb-3">
              <Badge className="bg-airborne-teal/10 text-airborne-deep dark:text-airborne-aqua border-transparent">
                {offer.discountLabel}
              </Badge>
            </div>

            <h3 className="text-base font-semibold leading-snug text-gray-900 dark:text-[#EDEDED]">
              {offer.title}
            </h3>
            {offer.subtitle && (
              <p className="mt-1.5 text-sm text-gray-500 dark:text-[#9CA3AF]">
                {offer.subtitle}
              </p>
            )}

            {offer.details && offer.details.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {offer.details.map((row) => (
                  <li
                    key={row}
                    className="flex items-center gap-2 text-xs text-gray-600 dark:text-[#C4C7CC]"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-airborne-teal"
                      aria-hidden
                    />
                    {row}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 pt-1">
              <Button
                variant="ghost"
                className="h-9 px-0 text-airborne-teal hover:bg-transparent hover:text-airborne-deep font-medium"
                disabled={!offer.route}
                onClick={() => {
                  if (offer.route) setLocation(offer.route);
                }}
                data-testid={`button-offer-cta-${offer.id}`}
              >
                <span className="flex items-center gap-1.5">
                  {offer.ctaLabel} <ArrowRight size={15} />
                </span>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
