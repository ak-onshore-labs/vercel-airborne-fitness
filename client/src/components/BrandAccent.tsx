import { useTheme } from "@/context/ThemeContext";

import aerialLight from "@/assets/brand/aerial-light-loader.gif";
import aerialDark from "@/assets/brand/aerial-dark-loader.gif";

/**
 * Decorative branded GIF accent for member app. Theme-aware; shown only on
 * Dashboard, Sessions, and Profile via MobileLayout. Not interactive.
 */
export function BrandAccent() {
  const { darkMode } = useTheme();
  const src = darkMode ? aerialDark : aerialLight;

  return (
    <div
      className="pointer-events-none shrink-0 select-none -mt-6 sm:-mt-7"
      aria-hidden
    >
      <img
        key={String(darkMode)}
        src={src}
        alt=""
        className="h-24 w-auto max-h-[140px] max-w-[120px] object-contain opacity-90 sm:h-28 sm:max-h-[160px] sm:max-w-[140px]"
        draggable={false}
        fetchPriority="low"
      />
    </div>
  );
}
