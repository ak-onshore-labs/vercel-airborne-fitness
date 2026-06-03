#!/usr/bin/env bash
# Transcode a single class preview clip for CDN upload.
#
# Usage:
#   ./scripts/media/transcode-class-video.sh path/to/source.mp4 <slug>
#
# Example:
#   ./scripts/media/transcode-class-video.sh aerial.mp4 aerial-fitness
#
# Output: scripts/media/out/classes/<slug>-v1.mp4

set -euo pipefail

SRC="${1:?Usage: $0 <source.mp4> <slug>}"
SLUG="${2:?Usage: $0 <source.mp4> <slug>}"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/out/classes"
mkdir -p "$OUT_DIR"

MP4="$OUT_DIR/${SLUG}-v1.mp4"

echo "→ Class preview: $SLUG → $MP4"
ffmpeg -y -i "$SRC" -t 5 \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
  -an \
  -c:v libx264 -profile:v main -pix_fmt yuv420p \
  -movflags +faststart \
  -b:v 1.5M -maxrate 1.8M -bufsize 3M \
  "$MP4"

BYTES=$(wc -c < "$MP4" | tr -d ' ')
echo "Done. size: $((BYTES / 1024)) KB"
if [ "$BYTES" -gt 1258291 ]; then
  echo "WARNING: file exceeds ~1.2 MB target — shorten clip or lower -b:v" >&2
fi
