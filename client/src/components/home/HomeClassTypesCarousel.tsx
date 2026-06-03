import { useLocation } from "wouter";
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoRotateCarousel } from "@/hooks/useAutoRotateCarousel";
import {
  getClassTypeImageSrc,
  getClassTypeInitials,
} from "@/lib/classTypeImages";
import { getClassMedia, type ClassMedia } from "@/lib/classMedia";

export interface ClassTypeOption {
  id: string;
  name: string;
  ageGroup?: string;
  strengthLevel?: number;
  descriptionPoints?: string[];
  isActive?: boolean;
}

interface HomeClassTypesCarouselProps {
  classTypes: ClassTypeOption[];
  /** Invoked when a class with a real preview video is tapped. */
  onWatch: (media: ClassMedia) => void;
}

/**
 * Horizontal, snap-scrolling row of class-type cards sourced from
 * /api/class-types. Shows the existing bundled class artwork (or initials) as a
 * poster. A "Watch" button appears only when a real preview video is mapped in
 * classMedia config — never a blank video placeholder. No autoplay here; tapping
 * Watch defers to a single shared video dialog.
 */
export function HomeClassTypesCarousel({
  classTypes,
  onWatch,
}: HomeClassTypesCarouselProps) {
  const [, setLocation] = useLocation();
  const rowRef = useAutoRotateCarousel<HTMLDivElement>(classTypes.length, 2400);

  if (classTypes.length === 0) return null;

  return (
    <section aria-label="Class types">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-[#EDEDED]">
          Explore Classes
        </h2>
      </div>

      <div
        ref={rowRef}
        className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 scroll-pl-6 scrollbar-hide touch-pan-x overscroll-x-contain"
        role="list"
      >
        {classTypes.map((ct) => {
          const imageSrc = getClassTypeImageSrc(ct.name);
          const initials = getClassTypeInitials(ct.name);
          const media = getClassMedia(ct.name);
          const hasVideo = Boolean(media?.videoSrc);
          const blurb = ct.descriptionPoints?.[0];

          return (
            <article
              key={ct.id}
              role="listitem"
              data-testid={`card-classtype-${ct.id}`}
              className="flex w-[72%] max-w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111113] shadow-sm dark:shadow-black/30"
            >
              {/* Poster */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-[#012E30] via-[#06181A] to-black">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt=""
                    aria-hidden
                    className="h-full w-full object-cover"
                    draggable={false}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-airborne-aqua">
                    {initials}
                  </div>
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
                  aria-hidden
                />

                {hasVideo && (
                  <button
                    type="button"
                    onClick={() =>
                      onWatch({
                        className: ct.name,
                        videoSrc: media?.videoSrc,
                        posterSrc: media?.posterSrc ?? imageSrc,
                        videoTitle: media?.videoTitle ?? ct.name,
                      })
                    }
                    aria-label={`Watch ${ct.name} preview`}
                    data-testid={`button-watch-${ct.id}`}
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-airborne-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-airborne-teal focus-visible:ring-offset-2"
                  >
                    <Play size={16} className="ml-0.5" fill="currentColor" />
                  </button>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-base font-semibold leading-tight text-white drop-shadow-sm">
                    {ct.name}
                  </h3>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {ct.ageGroup && (
                    <span className="rounded-full bg-gray-100 dark:bg-[#18181B] px-2.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-[#9CA3AF]">
                      {ct.ageGroup}
                    </span>
                  )}
                  {typeof ct.strengthLevel === "number" && (
                    <span className="rounded-full bg-teal-50 dark:bg-teal-900/30 px-2.5 py-0.5 text-[10px] font-medium text-airborne-deep dark:text-airborne-aqua">
                      Level {ct.strengthLevel}
                    </span>
                  )}
                </div>

                {blurb && (
                  <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-[#9CA3AF]">
                    {blurb}
                  </p>
                )}

                <div className="mt-auto">
                  <Button
                    className="h-10 w-full rounded-xl bg-gray-900 dark:bg-[#EDEDED] text-white dark:text-[#0B0B0C] font-medium hover:bg-airborne-deep dark:hover:bg-white"
                    onClick={() =>
                      setLocation(
                        `/enroll?category=${encodeURIComponent(ct.name)}`,
                      )
                    }
                    data-testid={`button-enroll-${ct.id}`}
                  >
                    <span className="flex items-center gap-1.5">
                      Enroll <ArrowRight size={15} />
                    </span>
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
