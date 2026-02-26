# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Rules

**BEFORE writing any code or making changes**, check:
1. Am I on `master`? If yes, STOP and create a worktree first
2. Never commit directly to master — all feature work requires a worktree

This is non-negotiable. If you're about to edit files and `git branch` shows `master`, run:
```bash
git worktree add -b feature/<name> ../toolweb-<name>
cd ../toolweb-<name> && pnpm install
```

**Stay scoped.** Fix/build what was asked. Don't refactor adjacent code, add docstrings, or expand scope.

## Commands

```bash
pnpm dev            # Dev server
pnpm build          # Production build (Cloudflare Pages)
pnpm preview        # Preview production build
pnpm astro check    # Type-check .astro + .ts files
```

### Database (Supabase CLI)

Supabase CLI runs via `npx` on this machine (not installed globally):
```bash
npx supabase migration new <name>   # Create a new migration file
npx supabase db push                # Push migrations to remote
npx supabase migration list         # Check migration status
```

Requires `SUPABASE_ACCESS_TOKEN` env var to be set first.

**Database environments:**
- Supabase project: `eknmuaffpvkiwylrybql` — single project, shared across preview and production
- Safe to push migrations anytime; both environments read from the same DB

## Git Workflow

**Always use worktrees for feature work.** Do not make changes directly on `master`.

```bash
# Create worktree for new feature
git worktree add -b feature/my-feature ../toolweb-my-feature

# Work in the worktree
cd ../toolweb-my-feature
pnpm install  # Required — worktrees don't share node_modules

# When done, push and clean up
git push -u origin feature/my-feature
cd ../toolweb
git worktree remove ../toolweb-my-feature
```

**Branches and deployment:**
- `master` → `tool.nyc` (production, live Stripe keys)
- `preview` → `pre.tool.nyc` (staging, test Stripe keys)
- Pages project: `toolweb` on `toolweb-3si.pages.dev`

## Architecture

Tool.NYC is a creative consultancy site built with Astro 5 in full SSR mode (`output: 'server'`), deployed to Cloudflare Pages.

The site serves as: portfolio mood board, inbound sales funnel (sticky CTA → Cal.com), client portal (magic link auth), and occasional merch shop.

### Stack
- **Runtime**: Astro 5 SSR → Cloudflare Pages (V8 isolates, NOT Node.js)
- **Database**: Supabase Postgres with Row Level Security
- **Auth**: Supabase Auth — magic links for clients, password for admin
- **Storage**: Cloudflare R2 for media, Cloudflare Stream for video
- **Payments**: Stripe Checkout + webhooks
- **Email**: Resend for transactional emails
- **Scheduling**: Cal.com embed
- **Animation**: GSAP + ScrollTrigger + Lenis smooth scroll
- **Styling**: Tailwind CSS

### Cloudflare Workers Constraints

This runs V8 isolates, NOT Node.js:
- **No Sharp** — use `browser-image-compression` client-side before upload
- **No `fs`** — file ops via R2 bindings only
- **No native Node modules** — Web API compatible libraries only
- Supabase JS + Stripe SDK work fine (both use fetch internally)

### Directory Structure
- `src/lib/` — Service clients, queries, mutations, types
- `src/pages/` — Astro pages and API routes
- `src/pages/api/` — API endpoints (checkout, stripe-webhook, inquiry, upload, auth)
- `src/pages/admin/` — Protected admin dashboard (SSR)
- `src/pages/portal/` — Client portal (magic link auth)
- `src/pages/work/` — Case study pages (`[slug].astro`)
- `src/pages/shop/` — Product listings and detail pages
- `src/components/` — Astro components (Accordion, FileUpload, VideoPlayer, etc.)
- `src/layouts/` — BaseLayout.astro (public), Admin.astro (admin)
- `src/scripts/` — Client-side JS (GSAP animations)
- `supabase/migrations/` — Database migrations (managed via Supabase CLI)
- `docs/style-guide.md` — Voice and copy guidelines

### Key Patterns

**Env var architecture** (`src/lib/env.ts`):
- All custom env vars read from `Astro.locals.runtime.env` via lazy singletons
- `import.meta.env` only used for Vite built-ins (`PROD`, `DEV`, `MODE`) in `cookies.ts`
- Non-secrets in `wrangler.toml [vars]` (split prod/preview sections)
- Secrets set via `wrangler pages secret put` (both environments)
- Local dev uses `.dev.vars` file
- Exported getters: `getSupabase()`, `getSupabaseAdmin()`, `getStripe()`, `getResendOrNull()`, `getEnv()`

**Supabase dual clients** (`src/lib/env.ts`):
- `getSupabase()` — anon key, respects RLS (public queries)
- `getSupabaseAdmin()` — service key, bypasses RLS (server-side mutations, auth)
- Initialization happens in middleware via `initClients(context.locals.runtime.env)`

**Auth middleware** (`src/middleware.ts`):
- Protects all `/admin/*` routes except `/admin/login`
- Protects `/portal/*` routes except `/portal` (login) and `/portal/verify`
- Uses cookie-based sessions (`sb-access-token`, `sb-refresh-token`)
- Stores authenticated user in `context.locals.user`, client record in `context.locals.client`

**Stripe flow**:
1. POST `/api/checkout` creates Stripe Checkout session
2. `/api/stripe-webhook` handles `checkout.session.completed`
3. Orders use `stripe_session_id` as idempotency key
4. Purchase emails fire from webhook via Resend, not app code

**Stripe ↔ Resend coupling**: Stale webhook endpoints poison idempotency. After any Resend/Stripe config change, verify the webhook in Stripe dashboard.

**Query layer** (`src/lib/queries.ts`):
- All public reads use the anon client (RLS-scoped)
- Returns empty arrays on error, never throws
- Admin pages import `getSupabaseAdmin()` directly for full access

### Data Model

Core tables: `portfolio_items`, `case_study_images`, `testimonials`, `writing_snippets`, `client_logos`, `clients`, `projects`, `project_inquiries`, `products`, `product_variants`, `orders`, `site_content`

**Enums:**
- `portfolio_category`: motion | graphic | web | brand
- `display_size`: small | medium | large (controls grid span on homepage)
- `content_status`: draft | published
- `product_status`: draft | upcoming | active | sold_out
- `order_status`: paid | shipped | delivered | refunded
- `client_status`: active | inactive
- `project_status`: inquiry | discovery | proposal | active | review | complete
- `inquiry_status`: new | reviewed | converted | declined

**Case studies:** Portfolio items with `is_case_study = true` and a `slug` get their own page at `/work/[slug]`. They have additional fields: `problem`, `solution`, `impact`, and a related `case_study_images` table for galleries.

**Site content:** Key-value store (`site_content` table) for editable text blocks. Keys used: `hero_tagline`, `about_blurb`, `process_blurb`. Grouped by `content_group`, sorted by `sort_order`.

### PostgREST / Supabase — Multiple Foreign Keys Between Tables

**CRITICAL**: When adding a foreign key that creates a second relationship between two tables, you MUST update all existing queries that embed the related table.

This causes PostgREST error `PGRST201: Could not embed because more than one relationship was found`. Fix by using explicit FK names:

```typescript
// Ambiguous (breaks with multiple FKs):
.select(`*, ticket_tiers (*)`)

// Explicit (works):
.select(`*, ticket_tiers!ticket_tiers_event_id_fkey (*)`)
```

Always test queries locally after adding FKs that reference tables already linked by other FKs.

## Design

Reference: [hardsun.com](https://hardsun.com) — editorial scroll, full-bleed imagery, generous whitespace, 1px grid gaps, sticky bottom CTA.

CMYK accents: Cyan `#00FFFF` · Magenta `#FF00FF` · Yellow `#FFEB00`

Mobile-first (traffic from Instagram/LinkedIn links).

### Animation System (`src/scripts/animations.ts`)

GSAP + Lenis smooth scroll with `prefers-reduced-motion` bailout. Elements use `data-anim` attributes and CSS classes (`anim-fade-up`, `anim-fade`) for initial hidden state. ScrollTrigger reveals on scroll. StickyBar slides up from bottom on a 1s delay.

Lenis is wired to GSAP's ticker — `lenis.raf(time * 1000)` on every frame, with `lagSmoothing(0)`.

## Voice & Copy

See `docs/style-guide.md` for full reference. Key points:
- Direct, understated confidence, plain language
- A person, not an agency — never say "we" when it's one person
- Site copy: composed and clear (potential client register)
- Portfolio/store: where personality and taste show up
- Anti-patterns: marketing buzzwords, hedging, superlatives, filler enthusiasm
- Primary audience: 2nd-degree connections via LinkedIn and Instagram

## Production-Critical Patterns

Lessons from live production bugs in the sibling VERBS codebase. These apply directly here.

**Stripe metadata must identify the checkout flow:**
- Always include `checkout_type` in Stripe session metadata (e.g., `'shop'`, `'invoice'`, `'pos'`)
- Log `session.id` and full `session.metadata` on webhook errors — bare `console.error('Missing metadata')` is useless in production

**Stripe `stock_count` safety:**
- Always clamp: `Math.max(0, stock_count - quantity)` — never allow negative inventory
- Validate `stripe_price_id` exists before rendering checkout — don't show a broken buy button
- If Stripe sync fails on product creation, surface a "Sync to Stripe" recovery path in admin

**Webhook handler discipline:**
- The webhook is the most dangerous code — it turns Stripe events into money and inventory changes
- Extract parsing logic into pure functions in `src/lib/`, test independently
- Route handler should only: (1) parse, (2) execute side effects, (3) return HTTP response
- Never inline-copy logic into test files — always import from production code

**Money math:**
- Stripe amounts are integers (cents). Divide by 100 once at the webhook boundary
- Keep internal calculations in cents to avoid IEEE 754 float issues
- Test with real prices ($13.99, $41.97) not round numbers — round numbers never expose float edge cases

**Don't duplicate business logic:**
- When fixing a bug, grep for ALL instances of the pattern across the codebase
- DB queries (`.eq('status', 'published')`) are business logic — if the rule changes, every query must update
- Define status/visibility checks once in `src/lib/`, import everywhere

## Testing

Vitest (unit/integration) + Playwright (E2E). Prioritize critical user flows (checkout, auth, portal access) over test count.

**Testing principles:**
- Extract pure logic into `src/lib/` modules — import in both route handlers and tests
- For numeric boundaries, always test: exact boundary, one past boundary, zero state, corrupted state (`sold_count > max_stock`)
- Never copy production logic into test files — tests must import from the real modules
- Verify float expectations with `node -e` before writing them in assertions
