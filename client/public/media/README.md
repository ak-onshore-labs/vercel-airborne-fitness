# Home page media — hosting and go-live guide

Production videos for Airborne **must not** live in this repo or be served by the Express API. Use a **CDN** (Cloudinary recommended; Bunny CDN as a budget alternative). The app keeps **small posters** local/bundled and loads **HTTPS video URLs** from config.

The homepage already supports optional video (`client/src/lib/classMedia.ts`, `HomeHeroMedia`, `ClassVideoDialog`). Until verified CDN URLs are configured, it stays **poster/static-only** — no broken players.

---

## Do not

- Commit raw or uncompressed MP4s (including the owner’s **50s / 9.5 MB** WhatsApp hero).
- Ship production videos in `client/public/media/` (inflates deploy size; wrong for wrapped apps that bundle web assets).
- Serve video from `/api/*` or Express static on the app server (bandwidth + latency on the API host).
- Enable `videoSrc` with unverified, placeholder, or relative `/media/*.mp4` paths in production.
- Overwrite CDN filenames in place — use **versioned** URLs (`hero-v2`, `aerial-fitness-v1`).

---

## Target specs (after transcode)

### Hero (from 576×1024 portrait source)

| | Target |
|---|--------|
| Duration | **8–12s** seamless loop (trim in editor; do not use full 50s) |
| Size | **≤ 3 MB** |
| Format | MP4, H.264 (yuv420p), **no audio** |
| Dimensions | 9:16 (720×1280 or 576×1024) |
| Poster | WebP or JPG, **≤ 100 KB**, same aspect |

### Class previews (~5s each)

| | Target |
|---|--------|
| Duration | **4–6s** |
| Size | **≤ ~1.2 MB** each |
| Format | MP4, H.264, **no audio** (or muted) |
| Dimensions | 9:16 portrait |

### Slugs (match `/api/class-types` names)

| Class name | File slug |
|------------|-----------|
| Aerial Fitness | `aerial-fitness` |
| Aerial Hoop & Silk | `aerial-hoop-silk` |
| Functional Training | `functional-training` |
| Kids Aerial Fitness | `kids-aerial-fitness` |
| Kids Advance Aerial (Hammock, Silk, Hoop) | `kids-advance-aerial` |
| Mat Pilates | `mat-pilates` |
| Trampoline Fitness | `trampoline-fitness` |

Versioned CDN paths example: `airborne/classes/aerial-fitness-v1.mp4`, `airborne/hero-v1.mp4`.

---

## Transcode locally (ops)

Requires [ffmpeg](https://ffmpeg.org/). Outputs go to `scripts/media/out/` (gitignored).

```bash
# Hero: source.mp4 [start_sec] [duration_sec]
./scripts/media/transcode-hero.sh ~/Downloads/owner-hero.mp4 5 10

# One class
./scripts/media/transcode-class-video.sh ~/Downloads/aerial.mp4 aerial-fitness

# Batch (place sources in scripts/media/in/classes/<slug>.mp4 first)
./scripts/media/transcode-all-classes.sh
```

---

## CDN upload (Cloudinary recommended)

1. Create a Cloudinary account and folder (e.g. `airborne/`).
2. Upload `hero-v1.mp4`, `hero-poster.webp`, and `classes/*-v1.mp4`.
3. Use **Video** / **Image** delivery URLs (HTTPS). Prefer transformations for size caps, e.g. `q_auto:eco`, `vc_h264`, `ac_none`.
4. Copy the **full delivery URL** for each asset (version in path, e.g. `/v1712345678/...`).
5. Open each URL in a browser — must play or display without login.

**Bunny alternative:** upload to Storage Zone, serve via Pull Zone; same versioning rules.

**Do not** use the app backend as origin for MP4 traffic.

---

## Enable URLs in the app

### Option A — Build-time env (V1, no homepage code change)

Set in Vercel / host environment (see `.env.example`). Rebuild/redeploy web.

| Variable | Purpose |
|----------|---------|
| `VITE_HERO_POSTER_URL` | Full HTTPS poster URL |
| `VITE_HERO_VIDEO_URL` | Full HTTPS hero loop URL |
| `VITE_CLASS_VIDEO_AERIAL_FITNESS` | Per-class preview URL |
| `VITE_CLASS_VIDEO_AERIAL_HOOP_SILK` | … |
| `VITE_CLASS_VIDEO_FUNCTIONAL_TRAINING` | … |
| `VITE_CLASS_VIDEO_KIDS_AERIAL_FITNESS` | … |
| `VITE_CLASS_VIDEO_KIDS_ADVANCE_AERIAL` | … |
| `VITE_CLASS_VIDEO_MAT_PILATES` | … |
| `VITE_CLASS_VIDEO_TRAMPOLINE_FITNESS` | … |

Only `https://` values are accepted. Unset vars → no video (current safe default).

Class posters continue to use bundled PNGs from `client/src/assets/class-types/` unless you set a custom `posterSrc` in code.

### Option B — Runtime API (Phase 4, optional)

`GET /api/home-media` returns the same shape from **server** env (`HERO_VIDEO_URL`, `HERO_POSTER_URL`, `CLASS_VIDEO_*` without `VITE_` prefix). Cached 5 minutes. Does not stream bytes.

The member homepage still uses build-time `VITE_*` today. Pointing Dashboard at this API later allows URL changes **without** a new web build (remote WebView picks up on refresh).

---

## Go-live checklist

Before setting env vars in production:

- [ ] Hero source trimmed to 8–12s, file ≤ 3 MB (not 9.5 MB / 50s).
- [ ] Each class clip ≤ ~1.2 MB.
- [ ] Every CDN URL opens directly in a browser.
- [ ] All URLs use **HTTPS**.
- [ ] CDN supports **Accept-Ranges** (Cloudinary/Bunny do).
- [ ] Poster ≤ 100 KB if used.
- [ ] Test `/dashboard` hero on **iOS** wrapped app / WebView (autoplay muted or poster fallback).
- [ ] Test **Android** WebView.
- [ ] Tap **Watch** on a class card — one video plays; closing dialog stops playback.
- [ ] Airplane mode / bad URL — hero stays gradient/poster; no blank video box.
- [ ] `prefers-reduced-motion` / Data Saver — hero does not attach video (expected).

---

## Local poster only (optional)

A small hero poster may live at `client/public/media/hero-poster.webp` (≤ 100 KB) and be referenced via `VITE_HERO_POSTER_URL=/media/hero-poster.webp` **only for same-origin static hosting** — still prefer CDN for production.

**Never** commit `hero.mp4` or class MP4s under `client/public/media/` for production.

---

## Cache and versioning

- Use new filenames or Cloudinary versions when replacing media (`hero-v2.mp4`).
- Update env vars to the new URL; redeploy web (Option A) or update server env (Option B).
- CDN should send long-cache headers on immutable versioned assets.

---

## Architecture summary

| Asset | Where | Served by |
|-------|--------|-----------|
| Class PNG posters | Bundled in JS build | App CDN / static |
| Hero poster (optional) | CDN or tiny `public/` file | CDN or app static |
| Hero + class videos | **CDN only** | Cloudinary / Bunny |
| API | `GET /api/home-media` | JSON URLs only, optional |

Wrapped Play Store / App Store apps that load the **live HTTPS URL** do not need a store release when only CDN URLs or server env change (Option B).
