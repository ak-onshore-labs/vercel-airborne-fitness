import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAutoRotateCarousel } from "@/hooks/useAutoRotateCarousel";
import type { HomeOffer, HomeOfferKind } from "@/lib/homeOffers";
import { HomeOfferDetailsSheet } from "@/components/home/HomeOfferDetailsSheet";
import { cn } from "@/lib/utils";

interface HomeOffersCarouselProps {
  offers: HomeOffer[];
}

const OFFER_CARD_VISUALS: Record<
  HomeOfferKind,
  {
    badgeEmoji: string;
    gradient: string;
    ring: string;
  }
> = {
  long_term: {
    badgeEmoji: "✨",
    gradient:
      "from-white via-teal-50/70 to-emerald-50/40 dark:from-[#111113] dark:via-[#0c1f20] dark:to-[#0a1819]",
    ring: "ring-airborne-teal/25 dark:ring-airborne-teal/30",
  },
  combination: {
    badgeEmoji: "🎉",
    gradient:
      "from-white via-teal-50/50 to-cyan-50/50 dark:from-[#111113] dark:via-[#0c1f20] dark:to-[#0a1a22]",
    ring: "ring-airborne-aqua/25 dark:ring-airborne-aqua/30",
  },
};

/**
 * Horizontal, snap-scrolling row of premium offer cards. Renders nothing when
 * there are no active offers. Mobile-first (touch swipe + scroll snap) and
 * gently auto-rotating (~2.4s, disabled under reduced motion).
 */
export function HomeOffersCarousel({ offers }: HomeOffersCarouselProps) {
  const rowRef = useAutoRotateCarousel<HTMLDivElement>(offers.length, 2400);
  const [selectedOffer, setSelectedOffer] = useState<HomeOffer | null>(null);

  if (offers.length === 0) return null;

  return (
    <>
      <section aria-label="Current offers">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-[#EDEDED]">
            Current Offers
          </h2>
        </div>

        <div
          ref={rowRef}
          className="-mx-6 flex snap-x snap-proximity gap-4 overflow-x-auto px-6 pb-2 scroll-pl-6 scrollbar-hide"
          role="list"
        >
          {offers.map((offer) => {
            const visuals = OFFER_CARD_VISUALS[offer.kind];

            return (
              <article
                key={offer.id}
                role="listitem"
                data-testid={`card-offer-${offer.id}`}
                className={cn(
                  "relative flex w-[85%] max-w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10 bg-gradient-to-br p-5 shadow-md dark:shadow-black/40 ring-1 ring-offset-0",
                  visuals.gradient,
                  visuals.ring,
                )}
              >
                {/* Shimmer sweep */}
                <div
                  className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                  aria-hidden
                >
                  <div className="offer-card-shimmer-band animate-offer-shimmer motion-reduce:animate-none" />
                </div>

                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24 bg-gradient-to-b from-airborne-teal/8 to-transparent"
                  aria-hidden
                />

                <div
                  className="absolute inset-y-0 left-0 z-0 w-[3px] bg-gradient-to-b from-airborne-teal to-airborne-deep"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -right-8 -top-8 z-0 h-28 w-28 rounded-full bg-airborne-teal/10 blur-2xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -left-6 -bottom-6 z-0 h-20 w-20 rounded-full bg-airborne-deep/5 blur-xl"
                  aria-hidden
                />

                {/* Corner emoji accents */}
                {offer.kind === "long_term" ? (
                  <>
                    <span
                      className="pointer-events-none absolute top-3 right-4 z-0 select-none text-base opacity-20 rotate-12 animate-offer-float motion-reduce:animate-none"
                      aria-hidden
                    >
                      ✨
                    </span>
                    <span
                      className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-3 z-0 select-none text-sm opacity-15 -rotate-6"
                      aria-hidden
                    >
                      ✨
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="pointer-events-none absolute top-3 right-4 z-0 select-none text-base opacity-25 animate-offer-float motion-reduce:animate-none"
                      aria-hidden
                    >
                      🎉
                    </span>
                    <span
                      className="pointer-events-none absolute bottom-16 right-5 z-0 select-none text-sm opacity-15"
                      aria-hidden
                    >
                      ✨
                    </span>
                  </>
                )}

                <div className="relative z-10">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="relative inline-flex overflow-hidden rounded-full">
                      <span
                        className="pointer-events-none absolute inset-0 animate-offer-badge-shine motion-reduce:animate-none bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/20"
                        aria-hidden
                      />
                      <Badge className="relative z-10 bg-gradient-to-r from-airborne-teal/15 to-airborne-deep/10 text-airborne-deep dark:text-airborne-aqua border-transparent">
                        {offer.discountLabel}
                      </Badge>
                    </span>
                    <span
                      className="text-sm opacity-80 select-none"
                      aria-hidden
                    >
                      {visuals.badgeEmoji}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold leading-snug text-gray-900 dark:text-[#EDEDED] drop-shadow-sm">
                    {offer.title}
                  </h3>
                  {offer.subtitle && (
                    <p className="mt-1.5 text-sm text-gray-500 dark:text-[#9CA3AF]">
                      {offer.subtitle}
                    </p>
                  )}

                  <div className="mt-5 pt-1">
                    <span className="offer-cta-snake motion-reduce:bg-gradient-to-r motion-reduce:from-airborne-teal/40 motion-reduce:to-airborne-aqua/30">
                      <Button
                        variant="outline"
                        className="offer-cta-snake-inner h-9 w-auto border-0 text-airborne-teal font-medium transition-colors hover:bg-airborne-teal/8 hover:text-airborne-deep active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:border motion-reduce:border-airborne-teal/40"
                        onClick={() => setSelectedOffer(offer)}
                        data-testid={`button-offer-cta-${offer.id}`}
                      >
                        <span className="relative flex items-center gap-1.5">
                          {offer.cardCtaLabel} <ArrowRight size={15} />
                        </span>
                      </Button>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <HomeOfferDetailsSheet
        offer={selectedOffer}
        onClose={() => setSelectedOffer(null)}
      />
    </>
  );
}
