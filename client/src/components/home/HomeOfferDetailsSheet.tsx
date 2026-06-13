import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { HomeOffer } from "@/lib/homeOffers";
import {
  buildLongTermDisplaySections,
  fetchGroupedPlans,
  formatInr,
  type LongTermDisplaySection,
} from "@/lib/homeOfferPricing";

interface HomeOfferDetailsSheetProps {
  offer: HomeOffer | null;
  onClose: () => void;
}

const COMBINATION_FOOTNOTE =
  "Applies when you purchase 2 or more different class types together. Discount rate depends on the plan duration you select.";

export function HomeOfferDetailsSheet({
  offer,
  onClose,
}: HomeOfferDetailsSheetProps) {
  const [, setLocation] = useLocation();
  const open = offer !== null;

  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceSections, setPriceSections] = useState<LongTermDisplaySection[]>(
    [],
  );

  useEffect(() => {
    if (!offer || offer.kind !== "long_term") {
      setPriceLoading(false);
      setPriceError(null);
      setPriceSections([]);
      return;
    }

    let cancelled = false;
    setPriceLoading(true);
    setPriceError(null);
    setPriceSections([]);

    fetchGroupedPlans().then((result) => {
      if (cancelled) return;
      setPriceLoading(false);
      if (!result.ok) {
        setPriceError(result.message);
        return;
      }
      const sections = buildLongTermDisplaySections(result.data);
      if (sections.length === 0) {
        setPriceError("empty");
      } else {
        setPriceSections(sections);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [offer?.id, offer?.kind]);

  const handleEnroll = () => {
    if (!offer?.enrollRoute) return;
    setLocation(offer.enrollRoute);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-[#111113]"
      >
        {offer && (
          <>
            <SheetHeader className="flex flex-row items-start justify-between space-y-0 px-6 pt-6 pb-3 pr-12 border-b border-gray-100 dark:border-white/6 shrink-0">
              <div className="space-y-2 text-left min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="text-lg text-gray-900 dark:text-[#EDEDED] leading-snug">
                    {offer.title}
                  </SheetTitle>
                  <Badge className="bg-airborne-teal/10 text-airborne-deep dark:text-airborne-aqua border-transparent shrink-0">
                    {offer.discountLabel}
                  </Badge>
                </div>
                {offer.modalIntro && (
                  <SheetDescription className="text-sm text-gray-500 dark:text-[#9CA3AF] text-left">
                    {offer.modalIntro}
                  </SheetDescription>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              {offer.kind === "combination" && offer.modalSlabs && (
                <div className="space-y-4 pb-2">
                  <ul className="space-y-2.5">
                    {offer.modalSlabs.map((slab) => (
                      <li
                        key={slab.label}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-gray-700 dark:text-[#C4C7CC]">
                          {slab.label}
                        </span>
                        <span className="font-semibold text-airborne-teal shrink-0">
                          {slab.percentOff}% off
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF] leading-relaxed">
                    {COMBINATION_FOOTNOTE}
                  </p>
                </div>
              )}

              {offer.kind === "long_term" && (
                <div className="space-y-5 pb-2">
                  {priceLoading && (
                    <div className="flex justify-center py-8">
                      <Loader2
                        className="h-7 w-7 animate-spin text-airborne-teal"
                        aria-label="Loading membership prices"
                      />
                    </div>
                  )}

                  {!priceLoading && priceError && (
                    <p className="text-sm text-gray-500 dark:text-[#9CA3AF] py-2">
                      {priceError === "empty"
                        ? "No Half-Yearly or Yearly plans are currently listed."
                        : "We couldn't load membership prices right now. You can still explore plans during enrollment."}
                    </p>
                  )}

                  {!priceLoading &&
                    !priceError &&
                    priceSections.map((section) => (
                      <div key={section.className}>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF] mb-2.5">
                          {section.className}
                        </h4>
                        <ul className="space-y-3">
                          {section.rows.map((row) => (
                            <li
                              key={`${section.className}-${row.planDbName}`}
                              className="rounded-lg border border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-[#0B0B0C]/40 px-3.5 py-3"
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDED] mb-1.5">
                                {row.planLabel}
                              </p>
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-sm line-through text-gray-400 dark:text-[#6B7280]">
                                  {formatInr(row.originalPrice)}
                                </span>
                                <span
                                  className="text-sm font-bold text-airborne-teal"
                                  aria-label={`Discounted price ${formatInr(row.discountedPrice)}`}
                                >
                                  {formatInr(row.discountedPrice)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-1">
                                You save {formatInr(row.savings)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                  {!priceLoading && !priceError && priceSections.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-[#9CA3AF] leading-relaxed pt-1 border-t border-gray-100 dark:border-white/6">
                      Prices shown before GST. Final amount may include
                      applicable taxes.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-gray-100 dark:border-white/6 px-6 pt-4 pb-safe space-y-2 bg-white dark:bg-[#111113]">
              <Button
                className="w-full h-11 bg-airborne-teal text-white hover:bg-airborne-deep"
                disabled={!offer.enrollRoute}
                onClick={handleEnroll}
                data-testid={`button-offer-enroll-${offer.id}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {offer.enrollCtaLabel} <ArrowRight size={15} />
                </span>
              </Button>
              <Button
                variant="ghost"
                className="w-full h-10 text-gray-500 dark:text-[#9CA3AF]"
                onClick={onClose}
                data-testid={`button-offer-close-${offer.id}`}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
