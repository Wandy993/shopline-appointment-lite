#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd -P)"
RELEASE_VERSION="0.8.3"
RELEASE_LABEL="0.8.3"
RELEASE_BUILD="staff-service-list-selector.1"
NAME="appointment-lite-v${RELEASE_LABEL}-staff-service-list-selector"
DIST_DIR="$ROOT_DIR/dist"
STAGE_DIR="${TMPDIR:-/tmp}/${NAME}.$$"
OUTPUT="$DIST_DIR/${NAME}.zip"

node "$ROOT_DIR/scripts/sync-theme-fonts.mjs" --source-only >&2 || exit 1
node "$ROOT_DIR/scripts/release-preflight.mjs" >&2 || exit 1

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
