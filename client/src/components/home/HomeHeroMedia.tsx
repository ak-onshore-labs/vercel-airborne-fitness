import { useEffect, useRef, useState } from "react";
import { HERO_MEDIA } from "@/lib/classMedia";

interface HomeHeroMediaProps {
  firstName: string;
}

const MEDIA_OBJECT_POSITION = "object-[center_25%]";

/** True when the user/device prefers reduced motion or data saving. */
function shouldSkipAutoplay(): boolean {
  if (typeof window === "undefined") return true;
  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const saveData = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection?.saveData;
  return Boolean(reducedMotion || saveData);
}

/** Defer work until the browser is idle (fallback: short timeout). */
function onIdle(cb: () => void): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(cb);
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 600);
  return () => window.clearTimeout(id);
}

/**
 * Full-bleed cinematic home hero.
 *
 * Renders a premium teal/black static visual immediately (poster image when
 * provided, otherwise a layered gradient). If `HERO_MEDIA.videoSrc` exists, the
 * video is lazy-attached after first paint (muted/looping/inline) and falls
 * back to the static visual on error, autoplay rejection, reduced motion, or
 * data-saver. Exactly one optional hero video element.
 */
export function HomeHeroMedia({ firstName }: HomeHeroMediaProps) {
  const { posterSrc, videoSrc } = HERO_MEDIA;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (!videoSrc) return;
    if (shouldSkipAutoplay()) return;
    const cancel = onIdle(() => setShowVideo(true));
    return cancel;
  }, [videoSrc]);

  useEffect(() => {
    if (!showVideo) return;
    const el = videoRef.current;
    if (!el) return;

    const tryPlay = () => {
      el.play()?.catch(() => setVideoFailed(true));
    };
    tryPlay();

    const onVisibility = () => {
      if (document.hidden) el.pause();
      else tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [showVideo]);

  const videoActive = showVideo && !videoFailed && Boolean(videoSrc);

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-[#06181A] h-[clamp(380px,62vh,520px)]"
      aria-label="Airborne hero"
    >
      {/* Base cinematic visual: gradient always present (zero-byte fallback). */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#012E30] via-[#06181A] to-black"
        aria-hidden
      />
      <div
        className={`absolute -left-1/4 top-[-10%] h-2/3 w-2/3 rounded-full bg-airborne-teal/25 blur-3xl transition-opacity duration-500 ${videoActive ? "opacity-40" : "opacity-100"}`}
        aria-hidden
      />
      <div
        className={`absolute bottom-[-15%] right-[-10%] h-2/3 w-2/3 rounded-full bg-airborne-deep/30 blur-3xl transition-opacity duration-500 ${videoActive ? "opacity-40" : "opacity-100"}`}
        aria-hidden
      />

      {/* Optional poster image layer. */}
      {posterSrc && (
        <img
          src={posterSrc}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover ${MEDIA_OBJECT_POSITION}`}
          draggable={false}
        />
      )}

      {/* Optional lazy video layer (over poster, under text overlay). */}
      {videoActive && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover ${MEDIA_OBJECT_POSITION}`}
          src={videoSrc}
          poster={posterSrc}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
          aria-hidden
        />
      )}

      {/* Light top vignette — header edge only, keeps video bright. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent"
        aria-hidden
      />

      {/* Greeting overlay. */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-6 pb-6">
        {/* Local dark patch for teal text readability — no page-bg fade. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 to-transparent"
          aria-hidden
        />
        <h1
          className="relative text-3xl font-bold leading-tight text-airborne-teal [text-shadow:0_1px_12px_rgba(0,0,0,0.75)]"
          data-testid="text-greeting"
        >
          Hi, {firstName}
        </h1>
        <p className="relative mt-1 text-sm text-airborne-teal/85 [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]">
          Welcome back to Airborne.
        </p>
      </div>
    </section>
  );
}
