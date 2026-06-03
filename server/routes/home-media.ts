import type { Express, Request, Response } from "express";
import { asyncHandler } from "../middleware.js";

/** Same rules as client resolveHttpsMediaUrl — CDN URLs only. */
function resolveHttpsMediaUrl(raw: string | undefined): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  if (!v.startsWith("https://")) return undefined;
  return v;
}

/** Server env keys (no VITE_ prefix). Mirror client class names. */
const CLASS_ENV_MAP: Array<{ className: string; envKey: string }> = [
  { className: "Aerial Fitness", envKey: "CLASS_VIDEO_AERIAL_FITNESS" },
  { className: "Aerial Hoop & Silk", envKey: "CLASS_VIDEO_AERIAL_HOOP_SILK" },
  { className: "Functional Training", envKey: "CLASS_VIDEO_FUNCTIONAL_TRAINING" },
  { className: "Kids Aerial Fitness", envKey: "CLASS_VIDEO_KIDS_AERIAL_FITNESS" },
  {
    className: "Kids Advance Aerial (Hammock, Silk, Hoop)",
    envKey: "CLASS_VIDEO_KIDS_ADVANCE_AERIAL",
  },
  { className: "Mat Pilates", envKey: "CLASS_VIDEO_MAT_PILATES" },
  { className: "Trampoline Fitness", envKey: "CLASS_VIDEO_TRAMPOLINE_FITNESS" },
];

export interface HomeMediaResponse {
  hero: { posterSrc?: string; videoSrc?: string };
  classes: Record<string, { videoSrc?: string; videoTitle?: string }>;
}

/**
 * Optional runtime home media config (Phase 4).
 * Public, read-only, cacheable. Returns only URLs explicitly set in env.
 * Does not stream video bytes — clients still load CDN directly.
 *
 * Homepage currently reads build-time VITE_* via classMedia.ts. Wiring
 * Dashboard to prefer this endpoint is a future step for no-rebuild URL swaps.
 */
export function registerHomeMediaRoutes(app: Express): void {
  app.get(
    "/api/home-media",
    asyncHandler(async (_req: Request, res: Response) => {
      const classes: HomeMediaResponse["classes"] = {};
      for (const { className, envKey } of CLASS_ENV_MAP) {
        const videoSrc = resolveHttpsMediaUrl(process.env[envKey]);
        if (videoSrc) {
          classes[className] = {
            videoSrc,
            videoTitle: `${className} preview`,
          };
        }
      }

      const body: HomeMediaResponse = {
        hero: {
          posterSrc: resolveHttpsMediaUrl(process.env.HERO_POSTER_URL),
          videoSrc: resolveHttpsMediaUrl(process.env.HERO_VIDEO_URL),
        },
        classes,
      };

      res.setHeader("Cache-Control", "public, max-age=300");
      res.json(body);
    }),
  );
}
