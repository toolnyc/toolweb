> **Where things live** - Client: Tool internal | Bucket: (none - top-level `~/Code/`, moved out of `products/` 2026-10-07) | Dropbox: `_Clients/Tool_Internal/` | Registry: Notion "Repos" DB (IDs in `~/Code/toolhub/CoS/NOTION.md`)

@import /Users/pete/Code/.agent/conventions.md

# Tool.NYC — Agent Instructions

## Critical Rules

**BEFORE writing any code or making changes**, check:
1. Am I on `master`? If yes, STOP and create a worktree first
2. Never commit directly to master — all feature work requires a worktree

```bash
git worktree add -b feature/<name> ../toolweb-<name>
cd ../toolweb-<name> && pnpm install
```

A pre-commit hook enforces this — commits to `master` will be rejected.

**Stay scoped.** Fix/build what was asked. Don't refactor adjacent code, add docstrings, or expand scope.

## Commands

```bash
pnpm dev            # Dev server
pnpm build          # Production build (Cloudflare Pages)
pnpm preview        # Preview production build
pnpm astro check    # Type-check .astro + .ts files
pnpm test           # Run all tests (unit + architecture invariants)
pnpm test:arch      # Run architecture invariant tests only
```

## Skills (Progressive Disclosure)

Domain knowledge is split into skill files. Read the relevant skill before making changes in that area:

| Skill | When to Load |
|-------|-------------|
| `.claude/skills/stripe-webhook.md` | Checkout, webhooks, orders, payments, money math |
| `.claude/skills/supabase-queries.md` | Database queries, migrations, RLS, dual client pattern |
| `.claude/skills/cloudflare-pages.md` | wrangler.toml, R2 uploads, V8 constraints, env vars |
| `.claude/skills/data-model.md` | Tables, enums, relationships, schema changes |

## Git Workflow

**Always use worktrees for feature work.**

```bash
git worktree add -b feature/my-feature ../toolweb-my-feature
cd ../toolweb-my-feature
pnpm install

git push -u origin feature/my-feature
cd ../toolweb
git worktree remove ../toolweb-my-feature
```

**Branches and deployment:**
- `master` -> `tool.nyc` (production, live Stripe keys)
- `preview` -> `pre.tool.nyc` (staging, test Stripe keys)

## Architecture

Tool.NYC is a creative consultancy site built with Astro 5 in full SSR mode (`output: 'server'`), deployed to Cloudflare Pages.

The site is public-only: portfolio mood board, inbound sales funnel (sticky CTA -> Cal.com), and occasional merch shop. No logins, no sessions, no protected routes — the admin dashboard and client portal were removed in #31.

### Stack
- **Runtime**: Astro 5 SSR -> Cloudflare Pages (V8 isolates, NOT Node.js)
- **Database**: Supabase Postgres with Row Level Security
- **Storage**: Cloudflare R2 for media (read-only — no upload path), Cloudflare Stream for video
- **Payments**: Stripe Checkout + webhooks
- **Email**: Resend for transactional emails
- **Scheduling**: Cal.com embed
- **Animation**: GSAP + ScrollTrigger + Lenis smooth scroll
- **Styling**: Tailwind CSS

### Directory Structure
- `src/lib/` — Service clients, queries, types
- `src/pages/` — Astro pages and API routes
- `src/pages/api/` — API endpoints (checkout, stripe-webhook, inquiry, ai-chat, telegram-webhook, outreach)
- `src/pages/work/` — Case study pages (`[slug].astro`)
- `src/pages/shop/` — Product listings and detail pages
- `src/components/` — Astro components
- `src/layouts/` — BaseLayout.astro
- `src/scripts/` — Client-side JS (GSAP animations)
- `supabase/migrations/` — Database migrations
- `tests/` — Architecture invariant tests + unit tests

### Key Patterns

- **Env vars**: All through `src/lib/env.ts` getters
- **Middleware** (`src/middleware.ts`): `initClients`, `shop_enabled` flag gate for `/shop/*`, public cache headers, analytics logging — no auth
- **Stripe flow**: See skills/stripe-webhook.md
- **Query layer**: See skills/supabase-queries.md
- **Data model**: See skills/data-model.md

## Design

Reference: [hardsun.com](https://hardsun.com) — editorial scroll, full-bleed imagery, generous whitespace, 1px grid gaps, sticky bottom CTA.

CMYK accents: Cyan `#00FFFF` / Magenta `#FF00FF` / Yellow `#FFEB00`

Mobile-first (traffic from Instagram/LinkedIn links).

### Animation System (`src/scripts/animations.ts`)

GSAP + Lenis smooth scroll with `prefers-reduced-motion` bailout. Elements use `data-anim` attributes and CSS classes for initial hidden state.

## Voice & Copy

Voice & style guide lives in Notion (Tool HQ → Voice & Style Guide). Direct, understated confidence, plain language.
A person, not an agency — never say "we" when it's one person.

## Architecture Enforcement

Invariants tested in `tests/architecture.test.ts`:
- No banned Node.js imports (sharp, fs, child_process — V8 constraint)
- `import.meta.env` isolation — env vars must go through `src/lib/env.ts` getters
- R2 upload pattern — `.stream()` rejected, must use `.arrayBuffer()`
- wrangler.toml consistency
- Stripe metadata — checkout endpoints must include `checkout_type`

## Testing

Vitest (unit/integration) + Playwright (E2E). Prioritize critical user flows over test count.
- Extract pure logic into `src/lib/` — import in both route handlers and tests
- Never copy production logic into test files — import from real modules
