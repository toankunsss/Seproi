#!/usr/bin/env bash
# Builds the Google Play promo videos from the real game.
#   tools/promo/make.sh [outDir]        → WhipBoss-promo-portrait.mp4 (1080x1920) + WhipBoss-promo-landscape.mp4 (1920x1080)
# Needs: node + Playwright (Chromium), python3 + numpy, ffmpeg with libx264.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/tools/promo/out}"
FRAMES="$OUT/frames"
mkdir -p "$OUT"

# 1. serve the game (if nothing is listening on :5566 yet)
if ! (exec 3<>/dev/tcp/127.0.0.1/5566) 2>/dev/null; then
  (cd "$ROOT" && PORT=5566 node serve.cjs >/dev/null 2>&1 &)
  sleep 1
fi

# 2. frames + event log, 3. sound track
node "$ROOT/tools/promo/record.cjs" "$FRAMES"
python3 "$ROOT/tools/promo/soundtrack.py" "$FRAMES/events.json" "$OUT/soundtrack.wav"

# 4. portrait video (store listing / YouTube Shorts)
ffmpeg -y -loglevel error -framerate 30 -i "$FRAMES/f%05d.jpg" -i "$OUT/soundtrack.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart \
  "$OUT/WhipBoss-promo-portrait.mp4"

# 5. landscape video: the portrait gameplay centred on a blurred copy of itself
ffmpeg -y -loglevel error -i "$OUT/WhipBoss-promo-portrait.mp4" -filter_complex \
  "[0:v]split[a][b];[a]scale=1920:-2,crop=1920:1080,boxblur=24:2,eq=brightness=-0.18[bg];[b]scale=-2:1080[fg];[bg][fg]overlay=(W-w)/2:0" \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a copy -movflags +faststart \
  "$OUT/WhipBoss-promo-landscape.mp4"

echo "Done: $OUT/WhipBoss-promo-portrait.mp4 and $OUT/WhipBoss-promo-landscape.mp4"
