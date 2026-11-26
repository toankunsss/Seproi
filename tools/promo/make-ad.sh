#!/usr/bin/env bash
# Short vertical ad from the real game, maxed out (tools/promo/ad.cjs).
#   AD_LANG=vi tools/promo/make-ad.sh [outDir]   → WhipBoss-ad-vi.mp4 (1080x1920)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LANG_="${AD_LANG:-vi}"
OUT="${1:-$ROOT/tools/promo/out}"
FRAMES="$OUT/ad-frames-$LANG_"
mkdir -p "$OUT"
if ! (exec 3<>/dev/tcp/127.0.0.1/5566) 2>/dev/null; then (cd "$ROOT" && PORT=5566 node serve.cjs >/dev/null 2>&1 &); sleep 1; fi
AD_LANG="$LANG_" node "$ROOT/tools/promo/ad.cjs" "$FRAMES"
python3 "$ROOT/tools/promo/soundtrack.py" "$FRAMES/events.json" "$OUT/ad-$LANG_.wav"
ffmpeg -y -loglevel error -framerate 30 -i "$FRAMES/f%05d.jpg" -i "$OUT/ad-$LANG_.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart \
  "$OUT/WhipBoss-ad-$LANG_.mp4"
echo "Done: $OUT/WhipBoss-ad-$LANG_.mp4"
