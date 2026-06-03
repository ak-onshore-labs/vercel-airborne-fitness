#!/usr/bin/env bash
# Batch transcode class previews. Place source files in scripts/media/in/classes/
# named <slug>.mp4 (see README slugs).
#
# Usage: ./scripts/media/transcode-all-classes.sh

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
IN="$DIR/in/classes"
SCRIPT="$DIR/transcode-class-video.sh"

SLUGS=(
  aerial-fitness
  aerial-hoop-silk
  functional-training
  kids-aerial-fitness
  kids-advance-aerial
  mat-pilates
  trampoline-fitness
)

for slug in "${SLUGS[@]}"; do
  src="$IN/${slug}.mp4"
  if [ ! -f "$src" ]; then
    echo "Skip $slug (missing $src)"
    continue
  fi
  bash "$SCRIPT" "$src" "$slug"
done
