# Tool.NYC — Remaining To-Do's

## External Services (requires credentials/config)

- [ ] Add Stripe keys to `.env` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- [ ] Add Resend API key to `.env` (`RESEND_API_KEY`) and verify `tool.nyc` domain
- [ ] Create Cloudflare R2 bucket (`tool-media`), add binding to `wrangler.toml`, set `R2_PUBLIC_URL` in `.env`
- [ ] Set Cal.com username in `/src/pages/book.astro` iframe `src`
- [ ] Connect git repo to Cloudflare Pages, add env vars in CF dashboard
- [ ] Point `tool.nyc` DNS to Cloudflare Pages, set up www redirect
- [ ] Create Stripe products/prices for merch variants, store `stripe_price_id` in `product_variants`
- [ ] Set up Stripe webhook endpoint in dashboard pointing to `/api/stripe-webhook`

## Components & Features

- [ ] **CartDrawer** — slide-in cart panel (shows items, quantities, subtotal, checkout button)
- [ ] **FileUpload** — admin component with `browser-image-compression` (client-side resize to WebP, max 1920px, quality 80), progress indicator, preview, posts to `/api/upload`
- [ ] **GSAP + Lenis scroll animations** — smooth scroll init, ScrollTrigger fade-in/reveal for portfolio items, subtle parallax on hero
- [ ] **VideoPlayer** component — inline video with play/pause on hover/tap for portfolio items
- [ ] **CountdownTimer** component — extract inline countdown script from shop.astro into reusable component
- [ ] **Accordion** component — expandable "+" sections for Services/Process/About on homepage (Hardsun pattern)

## Content & Data

- [ ] Upload real portfolio work (~10-15 pieces) via admin
- [ ] Write real writing snippets
- [ ] Add real client names to `client_logos`
- [ ] Write real site content (hero tagline, about blurb)
- [ ] Set up Supabase production environment (separate from preview)

## Testing

- [ ] **Unit tests** (Vitest) — cart logic, query helpers, cookie helpers, validation
- [ ] **Integration tests** — API routes (checkout, inquiry, webhook), DB queries, RLS policies
- [ ] **E2E tests** (Playwright) — homepage scroll, shop checkout flow, inquiry form, portal login, admin CRUD flows
- [ ] **Mobile viewport tests** — key pages at 375px width
- [ ] **Lighthouse audit** — target Performance > 90, Accessibility > 90

## Polish

- [ ] OG/social sharing images (meta tags are in place, need actual images)
- [ ] Favicon and apple-touch-icon
- [ ] Email templates for magic links, order confirmations, inquiry notifications (currently plain text)
- [ ] Error boundary / global error handling
- [ ] Loading states for client-side interactions
- [ ] Admin mobile sidebar (hamburger menu collapse)

## Phase 2+

- [ ] DocuSeal integration (e-signatures for contracts)
- [ ] Social media auto-post (Buffer or direct API to LinkedIn/Instagram)
- [ ] Analytics (Plausible or Fathom)
- [ ] Video hosting migration from Vimeo to Bunny.net Stream
