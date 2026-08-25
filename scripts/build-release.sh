#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd -P)"
VERSION="$(node -p "require('$ROOT_DIR/package.json').version")"
NAME="appointment-lite-v${VERSION}-scheduling-operations-service-appointments"
DIST_DIR="$ROOT_DIR/dist"
STAGE_DIR="${TMPDIR:-/tmp}/${NAME}.$$"
OUTPUT="$DIST_DIR/${NAME}.zip"

cleanup() { rm -rf "$STAGE_DIR"; }
trap cleanup EXIT INT TERM

mkdir -p "$DIST_DIR"
rm -f "$OUTPUT"
mkdir -p "$STAGE_DIR/$NAME"

rsync -a \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.DS_Store' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='theme-app-extension/' \
  --exclude='*.zip' \
  "$ROOT_DIR/" "$STAGE_DIR/$NAME/"

(
  cd "$STAGE_DIR"
  zip -qr "$OUTPUT" "$NAME"
)

unzip -t "$OUTPUT" >/dev/null
printf '%s\n' "$OUTPUT"
