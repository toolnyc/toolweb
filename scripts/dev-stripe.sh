#!/usr/bin/env bash
set -euo pipefail

# Dev startup script: Stripe CLI webhook forwarding + Astro dev server
# Usage: pnpm dev:stripe

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_DEV="$PROJECT_DIR/.env.dev"
ENV_FILE="$PROJECT_DIR/.env"
FORWARD_URL="http://localhost:4321/api/stripe-webhook"

STRIPE_PID=""
ASTRO_PID=""

cleanup() {
  echo ""
  echo "Shutting down..."
  [[ -n "$STRIPE_PID" ]] && kill "$STRIPE_PID" 2>/dev/null || true
  [[ -n "$ASTRO_PID" ]] && kill "$ASTRO_PID" 2>/dev/null || true
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# Check for stripe CLI
if ! command -v stripe &>/dev/null; then
  echo "Error: stripe CLI not found. Install it:"
  echo "  https://docs.stripe.com/stripe-cli#install"
  exit 1
fi

# Copy .env.dev → .env (Astro reads .env by default)
if [[ ! -f "$ENV_DEV" ]]; then
  echo "Error: .env.dev not found"
  exit 1
fi
cp "$ENV_DEV" "$ENV_FILE"

echo "Starting Stripe webhook listener → $FORWARD_URL"
echo ""

# Start stripe listen via process substitution so we can read its output
# stripe prints the webhook signing secret on startup, then streams events
WEBHOOK_SECRET=""

exec 3< <(stripe listen --forward-to "$FORWARD_URL" 2>&1)
STRIPE_PID=$!

# Read startup output to capture webhook secret (timeout after 15s)
TIMEOUT=30
COUNT=0
while IFS= read -r -t 1 line <&3; do
  echo "  [stripe] $line"
  if [[ "$line" =~ (whsec_[A-Za-z0-9_]+) ]]; then
    WEBHOOK_SECRET="${BASH_REMATCH[1]}"
    break
  fi
  COUNT=$((COUNT + 1))
  if [[ $COUNT -ge $TIMEOUT ]]; then
    break
  fi
done

# Keep streaming stripe output in background
while IFS= read -r line <&3; do
  echo "  [stripe] $line"
done &

if [[ -z "$WEBHOOK_SECRET" ]]; then
  echo ""
  echo "Warning: Could not capture Stripe webhook secret."
  echo "Make sure you've run 'stripe login' first."
  echo "Continuing without webhook secret..."
else
  echo ""
  echo "Captured webhook secret: ${WEBHOOK_SECRET:0:15}..."

  # Write into .env (the active file Astro reads)
  sed -i "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET|" "$ENV_FILE"

  # Persist into .env.dev for next run
  sed -i "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET|" "$ENV_DEV"

  echo "Updated .env and .env.dev with webhook secret"
fi

echo ""
echo "Starting Astro dev server..."
echo ""

cd "$PROJECT_DIR"
npx astro dev &
ASTRO_PID=$!

wait "$ASTRO_PID"
