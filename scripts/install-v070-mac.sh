#!/usr/bin/env bash
set -euo pipefail

VERSION="0.7.0"
RELEASE_NAME="appointment-lite-v0.7.0-shopline-subscription-integration"
ZIP_PATH="${1:-$HOME/Downloads/${RELEASE_NAME}.zip}"
PROJECT_DIR="${2:-$(pwd -P)}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/appointment-lite-v070.XXXXXX")"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT INT TERM

fail() {
  echo ""
  echo "========================================"
  echo "ERROR: Appointment Lite ${VERSION} install stopped"
  echo "$1"
  echo "========================================"
  exit 1
}

command -v node >/dev/null 2>&1 || fail "node is not installed"
command -v npm >/dev/null 2>&1 || fail "npm is not installed"
command -v unzip >/dev/null 2>&1 || fail "unzip is not installed"
command -v rsync >/dev/null 2>&1 || fail "rsync is not installed"

[ -f "$ZIP_PATH" ] || fail "ZIP not found: $ZIP_PATH"
[ -d "$PROJECT_DIR" ] || fail "Project directory not found: $PROJECT_DIR"
[ -f "$PROJECT_DIR/package.json" ] || fail "package.json not found in: $PROJECT_DIR"

PACKAGE_NAME="$(cd "$PROJECT_DIR" && node -p "require('./package.json').name" 2>/dev/null || true)"
[ "$PACKAGE_NAME" = "appointment-lite" ] || fail "This does not look like the Appointment Lite project: $PROJECT_DIR"

printf '\n========================================\n'
printf 'Appointment Lite %s\n' "$VERSION"
printf 'SHOPLINE Subscription Integration\n'
printf '========================================\n'
printf 'Project: %s\n' "$PROJECT_DIR"
printf 'ZIP:     %s\n' "$ZIP_PATH"

printf '\n[1/9] Verify ZIP\n'
unzip -t "$ZIP_PATH" >/dev/null || fail "ZIP integrity check failed"

printf '\n[2/9] Optional Git backup\n'
if [ -d "$PROJECT_DIR/.git" ]; then
  (
    cd "$PROJECT_DIR"
    if [ -n "$(git status --porcelain 2>/dev/null || true)" ]; then
      BACKUP_BRANCH="backup/v0.7.0-pre-subscription-$(date +%Y%m%d-%H%M%S)"
      git branch "$BACKUP_BRANCH" >/dev/null 2>&1 || true
      echo "Created backup branch: $BACKUP_BRANCH"
    else
      echo "Working tree is clean; no backup branch needed."
    fi
  )
else
  echo "No .git directory; skipping Git backup."
fi

printf '\n[3/9] Extract release\n'
unzip -q "$ZIP_PATH" -d "$TMP_DIR"
SRC_DIR="$TMP_DIR/$RELEASE_NAME"
[ -f "$SRC_DIR/package.json" ] || fail "Expected release root not found: $SRC_DIR"

printf '\n[4/9] Overlay source safely\n'
rsync -a \
  --exclude='.env' \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='theme-app-extension/' \
  "$SRC_DIR/" "$PROJECT_DIR/"

printf '\n[5/9] Preserve local Theme App Extension wrapper and sync source\n'
if [ -d "$PROJECT_DIR/theme-app-extension" ]; then
  rsync -a --delete "$PROJECT_DIR/theme-extension-source/" "$PROJECT_DIR/theme-app-extension/"
  echo "Theme source synchronized into existing theme-app-extension/."
else
  echo "theme-app-extension/ does not exist; skipping generated-extension sync."
fi

printf '\n[6/9] Install exact dependencies\n'
(cd "$PROJECT_DIR" && npm ci)

printf '\n[7/9] Syntax checks\n'
(cd "$PROJECT_DIR" && npm run check)

printf '\n[8/9] Test suite\n'
(cd "$PROJECT_DIR" && npm test)

printf '\n[9/9] Final status\n'
if [ -d "$PROJECT_DIR/.git" ]; then
  (cd "$PROJECT_DIR" && git status --short)
fi

printf '\n========================================\n'
printf 'Appointment Lite %s local upgrade complete\n' "$VERSION"
printf 'Do not enable SHOPLINE_SUBSCRIPTION_ENABLED until\n'
printf 'Partner Token + real SPU key + webhooks are configured.\n'
printf '========================================\n'
