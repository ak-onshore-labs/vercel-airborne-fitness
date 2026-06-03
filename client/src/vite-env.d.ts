/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full HTTPS URL to hero poster (Cloudinary/Bunny). Omit until verified. */
  readonly VITE_HERO_POSTER_URL?: string;
  /** Full HTTPS URL to hero loop MP4 (<=3 MB). Omit until verified. */
  readonly VITE_HERO_VIDEO_URL?: string;
  readonly VITE_CLASS_VIDEO_AERIAL_FITNESS?: string;
  readonly VITE_CLASS_VIDEO_AERIAL_HOOP_SILK?: string;
  readonly VITE_CLASS_VIDEO_FUNCTIONAL_TRAINING?: string;
  readonly VITE_CLASS_VIDEO_KIDS_AERIAL_FITNESS?: string;
  readonly VITE_CLASS_VIDEO_KIDS_ADVANCE_AERIAL?: string;
  readonly VITE_CLASS_VIDEO_MAT_PILATES?: string;
  readonly VITE_CLASS_VIDEO_TRAMPOLINE_FITNESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
