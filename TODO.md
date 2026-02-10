# Tool.NYC — To-Do List

## You (Pete)

### 1. API Keys & Services

- [ ] **Stripe** — add keys to `.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] **Stripe webhook** — create endpoint in Stripe dashboard pointing to `/api/stripe-webhook`
- [ ] **Stripe products** — create products/prices for merch variants, store `stripe_price_id` in `product_variants` table
- [ ] **Resend** — add `RESEND_API_KEY` to `.env`, verify `tool.nyc` domain in Resend dashboard
- [ ] **Cloudflare R2** — create bucket `tool-media`, generate API token, fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` in `.env`
- [ ] **Cal.com** — set up account, update iframe src in `/src/pages/book.astro` with your scheduling link

### 2. Deploy

- [ ] **Cloudflare Pages** — connect repo, set all env vars in CF dashboard
- [ ] **DNS** — point `tool.nyc` to Cloudflare Pages, set up www redirect
- [ ] **Supabase production** — create prod project (separate from preview), push migration, update env vars

### 3. Content (via Admin Dashboard)

- [ ] Upload portfolio work (~10-15 pieces) via `/admin/portfolio/new`
- [ ] Write writing snippets via `/admin/writing`
- [ ] Verify/update client logos in `client_logos` table
- [ ] Write real site copy (hero tagline, about blurb)
- [ ] Create real clients via `/admin/clients/new`
- [ ] Create projects for active clients with status, deliverables URL, invoice info
- [ ] Migrate Vimeo videos to Cloudflare Stream

### 4. Assets

- [ ] OG/social sharing images (meta tags are in place, need actual images)
- [ ] Favicon and apple-touch-icon
- [ ] Any branding assets (CMYK palette files, logos for R2)

---

## Claude

### 1. Pre-deploy (build on request)

- [ ] **FileUpload component** — admin component with `browser-image-compression` (client-side resize to WebP, max 1920px, quality 80), progress indicator, preview, posts to `/api/upload`
- [ ] **Wire up R2 upload** — update `/api/upload.ts` to use real `MEDIA_BUCKET` binding on Cloudflare Pages runtime
- [ ] **VideoPlayer component** — inline video with play/pause on hover/tap for portfolio items (Cloudflare Stream embed)
- [ ] **CountdownTimer component** — extract inline countdown script from `shop.astro` into reusable component
- [ ] **Email templates** — branded HTML templates for magic links, order confirmations, inquiry notifications (currently plain text)
- [ ] **Error boundary / global error handling**
- [ ] **Loading states** for client-side interactions (cart, forms, etc.)
- [ ] **Admin mobile sidebar** — hamburger menu collapse for small screens

### 2. Animations (when you're ready for polish)

- [ ] **GSAP + Lenis scroll animations** — smooth scroll init, ScrollTrigger fade-in/reveal for portfolio items, subtle parallax on hero

### 3. Testing

- [ ] **Vitest setup** — unit tests for cart logic, query helpers, cookie helpers, validation
- [ ] **Integration tests** — API routes (checkout, inquiry, webhook), DB queries, RLS policies
- [ ] **Playwright setup** — E2E tests for homepage scroll, shop checkout, inquiry form, portal login, admin CRUD
- [ ] **Mobile viewport tests** — key pages at 375px width
- [ ] **Lighthouse audit** — target Performance > 90, Accessibility > 90

---

## Phase 2+ (later)

- [ ] DocuSeal integration (e-signatures for contracts)
- [ ] Social media auto-post (Buffer or direct API to LinkedIn/Instagram)
- [ ] Analytics (Plausible or Fathom)
