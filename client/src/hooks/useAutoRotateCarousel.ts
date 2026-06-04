import { useEffect, useRef } from "react";

/**
 * Auto-rotates a CSS scroll-snap row card-by-card while keeping it manually
 * swipeable. Scrolls to each child's real `offsetLeft` (never arbitrary pixels)
 * so it always lands on a clean snap position with the same left inset, loops
 * back to the first card after the last, pauses briefly during manual
 * interaction, and is disabled entirely under `prefers-reduced-motion`.
 *
 * The leading-edge inset is preserved by scrolling relative to the first
 * child's `offsetLeft` (which equals the container's left padding), so every
 * card rests at the same gutter as card 1.
 */
export function useAutoRotateCarousel<T extends HTMLElement = HTMLDivElement>(
  itemCount: number,
  intervalMs = 2400,
) {
  const ref = useRef<T | null>(null);
  const indexRef = useRef(0);
  const pausedUntilRef = useRef(0);

  useEffect(() => {
    if (itemCount <= 1) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const items = () => Array.from(el.children) as HTMLElement[];
    const relativeOffset = (i: number, list: HTMLElement[]) =>
      list[i].offsetLeft - list[0].offsetLeft;

    const pause = (ms = 6000) => {
      pausedUntilRef.current = Date.now() + ms;
    };

    const tick = window.setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      const list = items();
      if (list.length <= 1) return;
      const next = (indexRef.current + 1) % list.length;
      indexRef.current = next;
      el.scrollTo({ left: relativeOffset(next, list), behavior: "smooth" });
    }, intervalMs);

    // Keep the active index in sync with manual scrolling so auto-rotate
    // resumes from wherever the user left off (no jumpy random positions).
    let scrollTimer = 0;
    const onScroll = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        const list = items();
        if (list.length === 0) return;
        let nearest = 0;
        let best = Infinity;
        for (let i = 0; i < list.length; i++) {
          const d = Math.abs(relativeOffset(i, list) - el.scrollLeft);
          if (d < best) {
            best = d;
            nearest = i;
          }
        }
        indexRef.current = nearest;
      }, 140);
    };

    const onInteract = () => pause();

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onInteract);
    el.addEventListener("touchstart", onInteract, { passive: true });
    el.addEventListener("wheel", onInteract, { passive: true });

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(scrollTimer);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onInteract);
      el.removeEventListener("touchstart", onInteract);
      el.removeEventListener("wheel", onInteract);
    };
  }, [itemCount, intervalMs]);

  return ref;
}
