#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

cd "$ROOT_DIR"

for required in index.html style.css game.js manifest.webmanifest assets audio; do
  if [[ ! -e "$required" ]]; then
    echo "Missing required runtime path: $required" >&2
    exit 1
  fi
done

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

cp index.html style.css game.js manifest.webmanifest "$DIST_DIR"/
rsync -a --exclude '.DS_Store' --exclude '*.md' --exclude '.gitkeep' assets/ "$DIST_DIR/assets/"
rsync -a --exclude '.DS_Store' --exclude '*.md' --exclude '.gitkeep' audio/ "$DIST_DIR/audio/"

find "$DIST_DIR" \( -name '.DS_Store' -o -name '*.md' -o -name '.gitkeep' \) -delete

echo "Built static site in $DIST_DIR"
