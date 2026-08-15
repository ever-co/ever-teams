#!/bin/bash
set -o pipefail
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export SHARP_FORCE_GLOBAL_LIBVIPS=false

PACKAGES=(
  "@ever-teams/types"
  "@ever-teams/toolkit-types"
  "@ever-teams/ts-config"
  "@ever-teams/eslint-config"
  "@ever-teams/tailwind-config"
  "@ever-teams/constants"
  "@ever-teams/hooks"
  "@ever-teams/utils"
  "@ever-teams/services"
  "@ever-teams/ui"
  "@ever-teams/toolkit-ui"
  "@ever-teams/api"
  "@ever-teams/tracking"
  "@ever-teams/atoms"
  "@ever-teams/chatgpt"
  "@ever-teams/builder"
  "@ever-teams/extensions"
  "@ever-teams/storybook"
  "@ever-teams/mobile"
  "ever-teams-server-web"
  "@ever-teams/playground"
  "@ever-teams/web"
  "@ever-teams/example-base"
  "@ever-teams/example-nextjs"
  "@ever-teams/example-nextjs-boilerplate"
  "@ever-teams/example-remix"
  "@ever-teams/example-saas-starter"
  "@ever-teams/example-vite"
)

RESULTS_FILE="/tmp/build-results.txt"
> "$RESULTS_FILE"

PASS=0
FAIL=0
SKIP=0

for pkg in "${PACKAGES[@]}"; do
  echo "========================================" | tee -a "$RESULTS_FILE"
  echo "Building: $pkg" | tee -a "$RESULTS_FILE"
  echo "========================================" | tee -a "$RESULTS_FILE"
  
  # Check if package has a build script
  HAS_BUILD=$(npx turbo run build --filter="$pkg" --dry-run 2>&1 | grep -c "build")
  
  if [ "$HAS_BUILD" -eq 0 ]; then
    echo "SKIP: $pkg (no build script)" | tee -a "$RESULTS_FILE"
    SKIP=$((SKIP + 1))
    continue
  fi
  
  npx turbo run build --filter="$pkg" --force 2>&1 | tee -a "$RESULTS_FILE"
  EXIT_CODE=${PIPESTATUS[0]}
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ PASS: $pkg" | tee -a "$RESULTS_FILE"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL: $pkg (exit code: $EXIT_CODE)" | tee -a "$RESULTS_FILE"
    FAIL=$((FAIL + 1))
  fi
  echo "" | tee -a "$RESULTS_FILE"
done

echo "" | tee -a "$RESULTS_FILE"
echo "========================================" | tee -a "$RESULTS_FILE"
echo "SUMMARY" | tee -a "$RESULTS_FILE"
echo "========================================" | tee -a "$RESULTS_FILE"
echo "✅ Passed: $PASS" | tee -a "$RESULTS_FILE"
echo "❌ Failed: $FAIL" | tee -a "$RESULTS_FILE"
echo "⏭️  Skipped: $SKIP" | tee -a "$RESULTS_FILE"
echo "Total: ${#PACKAGES[@]}" | tee -a "$RESULTS_FILE"

# List failed packages
if [ $FAIL -gt 0 ]; then
  echo "" | tee -a "$RESULTS_FILE"
  echo "Failed packages:" | tee -a "$RESULTS_FILE"
  grep "^❌ FAIL:" "$RESULTS_FILE" | tee -a "$RESULTS_FILE"
fi

