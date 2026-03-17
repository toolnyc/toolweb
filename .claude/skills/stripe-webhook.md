# Stripe & Webhook Patterns

Load this skill when touching: `src/pages/api/checkout.ts`, `src/pages/api/stripe-webhook.ts`, `src/lib/mutations.ts` (order-related), or any Stripe integration code.

## Stripe Flow

1. POST `/api/checkout` creates Stripe Checkout session
2. `/api/stripe-webhook` handles `checkout.session.completed`
3. Orders use `stripe_session_id` as idempotency key
4. Purchase emails fire from webhook via Resend, not app code

## Stripe API Version

Use `'2026-01-28.clover'` — this is configured in `src/lib/env.ts`.

## Metadata Rules

- Always include `checkout_type` in Stripe session metadata (e.g., `'shop'`, `'invoice'`, `'pos'`)
- Log `session.id` and full `session.metadata` on webhook errors — bare `console.error('Missing metadata')` is useless in production
- Type casting for metadata: `as unknown as Record<string, unknown>`

## Money Math

- Stripe amounts are integers (cents). Divide by 100 **once** at the webhook boundary
- Keep internal calculations in cents to avoid IEEE 754 float issues
- Test with real prices ($13.99, $41.97) not round numbers — round numbers never expose float edge cases

## Stock Safety

- Always clamp: `Math.max(0, stock_count - quantity)` — never allow negative inventory
- Validate `stripe_price_id` exists before rendering checkout — don't show a broken buy button
- If Stripe sync fails on product creation, surface a "Sync to Stripe" recovery path in admin

## Webhook Handler Discipline

The webhook is the most dangerous code — it turns Stripe events into money and inventory changes.

- Extract parsing logic into pure functions in `src/lib/`, test independently
- Route handler should only: (1) parse, (2) execute side effects, (3) return HTTP response
- Never inline-copy logic into test files — always import from production code

## Stripe + Resend Coupling

Stale webhook endpoints poison idempotency. After any Resend/Stripe config change, verify the webhook in Stripe dashboard.
