#!/usr/bin/env bash
# Configure GA4 + Meta Pixel on Vercel for Production and Preview.
# Usage: ./scripts/set-vercel-analytics-env.sh G-XXXXXXXXXX 1234567890123456
set -euo pipefail

GA_ID="${1:-}"
META_PIXEL_ID="${2:-}"

if [[ -z "$GA_ID" || -z "$META_PIXEL_ID" ]]; then
  echo "Usage: $0 <VITE_GA_MEASUREMENT_ID> <VITE_META_PIXEL_ID>"
  echo "Example: $0 G-ABC123XYZ 1234567890123456"
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Installing Vercel CLI..."
  npm install -g vercel
fi

for env in production preview; do
  printf '%s' "$GA_ID" | vercel env add VITE_GA_MEASUREMENT_ID "$env" --force
  printf '%s' "$META_PIXEL_ID" | vercel env add VITE_META_PIXEL_ID "$env" --force
  echo "Set analytics env vars for $env"
done

echo "Done. Redeploy production: vercel --prod"
