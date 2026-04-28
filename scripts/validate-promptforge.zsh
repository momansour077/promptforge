#!/bin/zsh

set -euo pipefail

ROOT_DIR="/Users/mohamedmansour/promptforge"

cd "$ROOT_DIR/apps/backend"
npm run typecheck
npm test
npm run build

cd "$ROOT_DIR/apps/frontend"
npm run typecheck
npm test
npm run build

echo "PromptForge validation completed successfully."

