import { useCallback, useEffect, useRef, useState } from "react";
import { HERO_MEDIA } from "@/lib/classMedia";
import heroFallbackImg from "@/assets/home/hero-fallback.jpg";

interface HomeHeroMediaProps {
  firstName: string;
}

const MEDIA_OBJECT_POSITION = "object-[center_25%]";

type WebKitHTMLVideoElement = HTMLVideoElement & {
  webkitDisplayingFullscreen?: boolean;
};

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

/** iOS/WKWebView inline playback flags — call before src assignment and play(). */
function prepareInlineHeroVideo(el: HTMLVideoElement): void {
  el.muted = true;
  el.defaultMuted = true;
  el.playsInline = true;
  el.controls = false;
  el.setAttribute("muted", "");
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "true");
  try {
    el.disablePictureInPicture = true;
  } catch {
    // no-op for unsupported browsers
  }
}

/** Register iOS native fullscreen listeners; inert on Android/desktop. */
function attachHeroVideoFailListeners(
  el: HTMLVideoElement,
  onFail: () => void,
  cleanupFns: Array<() => void>,
): void {
  const onWebKitFullscreen = () => onFail();
  el.addEventListener("webkitbeginfullscreen", onWebKitFullscreen);
  el.addEventListener("webkitendfullscreen", onWebKitFullscreen);
  cleanupFns.push(() => {
    el.removeEventListener("webkitbeginfullscreen", onWebKitFullscreen);
    el.removeEventListener("webkitendfullscreen", onWebKitFullscreen);
  });
}

/** After play() resolves, fail if iOS escalated to native fullscreen. */
function checkWebKitFullscreenAfterPlay(
  el: HTMLVideoElement,
  onFail: () => void,
): () => void {
  const rafId = requestAnimationFrame(() => {
    if ((el as WebKitHTMLVideoElement).webkitDisplayingFullscreen) onFail();
  });
  return () => cancelAnimationFrame(rafId);
}

/**
 * Full-bleed cinematic home hero.
 *
 * Renders a premium static hero visual immediately (bundled studio photo, with
 * optional CDN poster when configured). If `HERO_MEDIA.videoSrc` exists, the
 * video is lazy-attached after first paint (muted/looping/inline) and falls
 * back to the static visual on error, autoplay rejection, native fullscreen
 * takeover, reduced motion, or data-saver. Exactly one optional hero video element.
 */
export function HomeHeroMedia({ firstName }: HomeHeroMediaProps) {
  const { posterSrc, videoSrc } = HERO_MEDIA;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const srcAttachedRef = useRef(false);
  const heroFailedRef = useRef(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const failHeroVideo = useCallback(() => {
    if (heroFailedRef.current) return;
    heroFailedRef.current = true;
    setVideoFailed(true);
  }, []);

  useEffect(() => {
    if (!videoSrc) return;
    if (shouldSkipAutoplay()) return;
    const cancel = onIdle(() => setShowVideo(true));
    return cancel;
  }, [videoSrc]);

  useEffect(() => {
    if (!showVideo || !videoSrc) return;
    const el = videoRef.current;
    if (!el) return;

    const cleanupFns: Array<() => void> = [];
    attachHeroVideoFailListeners(el, failHeroVideo, cleanupFns);

    const tryPlay = () => {
      if (heroFailedRef.current) return;
      prepareInlineHeroVideo(el);
      const p = el.play();
      if (!p) return;
      p.then(() => {
        cleanupFns.push(checkWebKitFullscreenAfterPlay(el, failHeroVideo));
      }).catch(() => failHeroVideo());
    };

    if (!srcAttachedRef.current) {
      prepareInlineHeroVideo(el);
      el.src = videoSrc;
      srcAttachedRef.current = true;
      el.load();
      tryPlay();
    }

    const onVisibility = () => {
      if (document.hidden) el.pause();
      else tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cleanupFns.forEach((fn) => fn());
      document.removeEventListener("visibilitychange", onVisibility);
      srcAttachedRef.current = false;
    };
  }, [showVideo, videoSrc, failHeroVideo]);

  const videoActive = showVideo && !videoFailed && Boolean(videoSrc);

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-[#06181A] h-[clamp(380px,62vh,520px)]"
      aria-label="Airborne hero"
    >
      {/* Base hero visual: bundled studio photo (always present). */}
      <img
        src={heroFallbackImg}
        alt=""
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover ${MEDIA_OBJECT_POSITION}`}
        draggable={false}
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

      {/* Optional lazy video layer (over poster, under text overlay). Src set imperatively for iOS inline playback. */}
      {videoActive && (
        <video
          ref={videoRef}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${MEDIA_OBJECT_POSITION}`}
          poster={posterSrc}
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          disablePictureInPicture
          controlsList="nodownload noplaybackrate noremoteplayback"
          onError={() => failHeroVideo()}
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
