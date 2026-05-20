#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="/tmp/neon-road-rally-newgrounds-alpha"
ZIP_PATH="/tmp/neon-road-rally-newgrounds-alpha.zip"

cd "$ROOT_DIR"

for required in index.html style.css game.js assets audio; do
  if [[ ! -e "$required" ]]; then
    echo "Missing required runtime path: $required" >&2
    exit 1
  fi
done

rm -rf "$OUT_DIR" "$ZIP_PATH"
mkdir -p "$OUT_DIR"

cp index.html style.css game.js "$OUT_DIR"/
rsync -a --exclude '.DS_Store' --exclude '*.md' --exclude '.gitkeep' assets/ "$OUT_DIR/assets/"
rsync -a --exclude '.DS_Store' --exclude '*.md' --exclude '.gitkeep' audio/ "$OUT_DIR/audio/"

find "$OUT_DIR" \( -name '.DS_Store' -o -name '*.md' -o -name '.gitkeep' \) -delete

(
  cd "$OUT_DIR"
  zip -qr "$ZIP_PATH" index.html style.css game.js assets audio
)

echo "Prepared Newgrounds alpha package:"
echo "  Folder: $OUT_DIR"
echo "  ZIP: $ZIP_PATH"
