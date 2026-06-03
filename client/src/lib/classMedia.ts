/**
 * Home page media URLs (hero + class preview videos).
 *
 * Production strategy (see client/public/media/README.md):
 * - Small posters: bundled class PNGs and/or optional local hero poster (<=100 KB).
 * - Videos: HTTPS CDN only (Cloudinary or Bunny). Never commit production MP4s.
 * - Backend must NOT stream video; optional GET /api/home-media for Phase 4.
 *
 * videoSrc is optional everywhere:
 * - Hero: gradient/poster when unset; lazy video only when a verified URL is set.
 * - Classes: image-only cards; Watch appears only when videoSrc is present.
 *
 * Enable videos by setting VITE_* env vars at build time (Vercel/host env).
 * Values must be full https:// URLs that return 200 in a browser. Do not set
 * placeholder or unverified URLs — broken src is avoided because empty env
 * leaves videoSrc undefined.
 */

import { normalizeClassTypeName } from "@/lib/classTypeImages";

export interface ClassMedia {
  className: string;
  posterSrc?: string;
  videoSrc?: string;
  videoTitle?: string;
}

/** Accept only non-empty HTTPS URLs (blocks accidental http or relative /media paths in prod). */
export function resolveHttpsMediaUrl(
  raw: string | undefined,
): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  if (!v.startsWith("https://")) return undefined;
  return v;
}

/**
 * Class names must match /api/class-types `name` exactly.
 * videoSrc is filled only when the matching VITE_CLASS_VIDEO_* env is set.
 */
const CLASS_VIDEO_BINDINGS: Array<{
  className: string;
  videoEnv: keyof ImportMetaEnv;
}> = [
  { className: "Aerial Fitness", videoEnv: "VITE_CLASS_VIDEO_AERIAL_FITNESS" },
  {
    className: "Aerial Hoop & Silk",
    videoEnv: "VITE_CLASS_VIDEO_AERIAL_HOOP_SILK",
  },
  {
    className: "Functional Training",
    videoEnv: "VITE_CLASS_VIDEO_FUNCTIONAL_TRAINING",
  },
  {
    className: "Kids Aerial Fitness",
    videoEnv: "VITE_CLASS_VIDEO_KIDS_AERIAL_FITNESS",
  },
  {
    className: "Kids Advance Aerial (Hammock, Silk, Hoop)",
    videoEnv: "VITE_CLASS_VIDEO_KIDS_ADVANCE_AERIAL",
  },
  { className: "Mat Pilates", videoEnv: "VITE_CLASS_VIDEO_MAT_PILATES" },
  {
    className: "Trampoline Fitness",
    videoEnv: "VITE_CLASS_VIDEO_TRAMPOLINE_FITNESS",
  },
];

function buildClassMediaList(): ClassMedia[] {
  return CLASS_VIDEO_BINDINGS.map(({ className, videoEnv }) => {
    const videoSrc = resolveHttpsMediaUrl(import.meta.env[videoEnv]);
    if (!videoSrc) return { className };
    return {
      className,
      videoSrc,
      videoTitle: `${className} preview`,
    };
  }).filter((m) => m.videoSrc !== undefined);
}

const CLASS_MEDIA: ClassMedia[] = buildClassMediaList();

const CLASS_MEDIA_BY_NAME: Record<string, ClassMedia> = Object.fromEntries(
  CLASS_MEDIA.map((m) => [normalizeClassTypeName(m.className), m]),
);

export function getClassMedia(className: string): ClassMedia | undefined {
  return CLASS_MEDIA_BY_NAME[normalizeClassTypeName(className)];
}

/**
 * Hero media. videoSrc/posterSrc come from env only — no hardcoded /media/*.mp4.
 *
 * Example (after CDN upload — set in Vercel, do not commit secrets):
 *   VITE_HERO_POSTER_URL=https://res.cloudinary.com/<cloud>/image/upload/v123/hero-poster.webp
 *   VITE_HERO_VIDEO_URL=https://res.cloudinary.com/<cloud>/video/upload/v123/hero-v1.mp4
 */
export const HERO_MEDIA: { posterSrc?: string; videoSrc?: string } = {
  posterSrc: resolveHttpsMediaUrl(import.meta.env.VITE_HERO_POSTER_URL),
  videoSrc: resolveHttpsMediaUrl(import.meta.env.VITE_HERO_VIDEO_URL),
};

/*
 * Manual overrides (alternative to env): append to CLASS_MEDIA in buildClassMediaList
 * only after verifying the URL in a browser. Prefer env vars for deploy flexibility.
 *
 * {
 *   className: "Aerial Fitness",
 *   videoSrc: "https://res.cloudinary.com/<cloud>/video/upload/v1710000000/airborne/classes/aerial-fitness-v1.mp4",
 *   videoTitle: "Aerial Fitness preview",
 * }
 */
