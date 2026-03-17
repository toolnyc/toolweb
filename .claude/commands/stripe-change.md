# Stripe Change Workflow

Use when modifying checkout, webhook handling, products, or payment-related code.

## Pre-change

1. Read the current webhook handler: `src/pages/api/stripe-webhook.ts`
2. Read the checkout endpoint: `src/pages/api/checkout.ts`
3. Check `src/lib/mutations.ts` for order creation logic

## Implementation Checklist

- [ ] `checkout_type` included in Stripe session metadata
- [ ] `session.id` and `session.metadata` logged on webhook errors
- [ ] Stock updates use `Math.max(0, stock_count - quantity)`
- [ ] `stripe_price_id` validated before rendering checkout buttons
- [ ] Money amounts stay in cents internally, divided by 100 only at display boundary
- [ ] Webhook handler follows the pattern: (1) parse, (2) side effects, (3) HTTP response
- [ ] Parsing logic lives in `src/lib/` as pure functions, not inline in the route handler

## Post-change

1. **Build check**:
   ```bash
   pnpm build
   ```

2. **Test with real prices**: Use $13.99, $41.97 — not round numbers (round numbers hide float bugs).

3. **If webhook endpoint changed**: Verify in Stripe dashboard that the webhook URL is correct and events are being delivered.

4. **If Resend templates changed**: Check Stripe webhook → Resend coupling. Stale webhook endpoints poison idempotency.
