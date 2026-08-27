#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd -P)"
RELEASE_VERSION="0.6.11"
NAME="appointment-lite-v${RELEASE_VERSION}-email-template-polish"
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
  --exclude='node_modules' \
  --exclude='node_modules/' \
  --exclude='node_modules.*/' \
  --exclude='dist/' \
  --exclude='theme-app-extension/' \
  --exclude='.shopline-cli.yml' \
  --exclude='*.zip' \
  "$ROOT_DIR/" "$STAGE_DIR/$NAME/"

(
  cd "$STAGE_DIR"
  zip -qr "$OUTPUT" "$NAME"
)

unzip -t "$OUTPUT" >/dev/null
printf '%s\n' "$OUTPUT"
