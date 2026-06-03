#!/usr/bin/env bash
# Transcode the owner hero source (portrait WhatsApp MP4) into a production-ready
# silent loop for CDN upload. Does NOT commit output to the repo.
#
# Usage:
#   ./scripts/media/transcode-hero.sh path/to/source.mp4 [start_seconds] [duration_seconds]
#
# Defaults: start=0, duration=10 (8–12s recommended)
#
# Requires: ffmpeg
#
# Outputs (gitignored via scripts/media/.gitignore patterns in README):
#   scripts/media/out/hero-v1.mp4
#   scripts/media/out/hero-poster.webp

set -euo pipefail

SRC="${1:?Usage: $0 <source.mp4> [start_sec] [duration_sec]}"
START="${2:-0}"
DUR="${3:-10}"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/out"
mkdir -p "$OUT_DIR"

MP4="$OUT_DIR/hero-v1.mp4"
POSTER="$OUT_DIR/hero-poster.webp"

echo "→ Hero loop: ${DUR}s from ${START}s → $MP4"
ffmpeg -y -ss "$START" -i "$SRC" -t "$DUR" \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
  -an \
  -c:v libx264 -profile:v main -pix_fmt yuv420p \
  -movflags +faststart \
  -b:v 2M -maxrate 2.5M -bufsize 5M \
  "$MP4"

echo "→ Poster frame → $POSTER"
ffmpeg -y -ss "$START" -i "$SRC" -vframes 1 \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
  -q:v 80 \
  "$POSTER"

BYTES=$(wc -c < "$MP4" | tr -d ' ')
echo "Done. hero-v1.mp4 size: $((BYTES / 1024)) KB"
if [ "$BYTES" -gt 3145728 ]; then
  echo "WARNING: file exceeds 3 MB target — trim further or lower -b:v" >&2
fi
echo "Upload $MP4 and $POSTER to Cloudinary/Bunny, then set VITE_HERO_VIDEO_URL / VITE_HERO_POSTER_URL (see client/public/media/README.md)."
