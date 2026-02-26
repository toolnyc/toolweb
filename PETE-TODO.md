# Pete — 90-Minute Sprint Checklist

## 1. Environment Setup
- [ ] Copy `.env.example` → `.env`
- [ ] Fill in `PUBLIC_SUPABASE_URL`
- [ ] Fill in `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- [ ] Fill in `SUPABASE_SECRET_KEY`
- [ ] Fill in `PUBLIC_SITE_URL` (e.g. `http://localhost:4321` for now)
- [ ] Run `pnpm dev` — verify dev server boots without errors

## 2. Supabase
- [ ] Run `supabase db push` against preview project
- [ ] Verify tables exist: `portfolio_items`, `products`, `product_variants`, `orders`, `clients`, `projects`, `site_content`, `writing_snippets`, `client_logos`, `project_inquiries`
- [ ] Seed `site_content` with at least: `hero_tagline`, `about_blurb`

## 3. Stripe
- [ ] Create Stripe account / get test keys
- [ ] Add `STRIPE_SECRET_KEY` to `.env`
- [ ] Add `PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env`
- [ ] Create at least 1 test product + price in Stripe dashboard
- [ ] Copy that `stripe_price_id` — you'll put it in `product_variants` later
- [ ] Create webhook endpoint → `https://<your-domain>/api/stripe-webhook`
- [ ] Add `STRIPE_WEBHOOK_SECRET` to `.env`

## 4. Resend
- [ ] Create Resend account at resend.com
- [ ] Add & verify `tool.nyc` domain (or use test domain for now)
- [ ] Add `RESEND_API_KEY` to `.env`

## 5. Cloudflare R2
- [ ] Create R2 bucket named `tool-media`
- [ ] Generate R2 API token (read/write)
- [ ] Fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- [ ] Fill in `R2_BUCKET_NAME` (`tool-media`)
- [ ] Set up public access, fill in `R2_PUBLIC_URL`

## 6. Cal.com
- [ ] Create Cal.com account + scheduling link
- [ ] Send me the Cal.com embed URL so I can update `book.astro`

## 7. Assets (if time)
- [ ] Drop a favicon into `public/favicon.ico`
- [ ] Drop an OG image into `public/og.png` (1200x630)
- [ ] Apple touch icon → `public/apple-touch-icon.png` (180x180)
