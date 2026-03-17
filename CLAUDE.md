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

## Workflow Commands

Reusable workflows for common multi-step operations:

| Command | Use When |
|---------|----------|
| `.claude/commands/worktree.md` | Starting any feature work |
| `.claude/commands/new-feature.md` | End-to-end feature implementation |
| `.claude/commands/migration.md` | Database schema changes |
| `.claude/commands/deploy.md` | Pre-deploy checklist and deployment |
| `.claude/commands/stripe-change.md` | Any payment/checkout modification |

## Git Workflow

**Always use worktrees for feature work.** Do not make changes directly on `master`.

```bash
# Create worktree for new feature
git worktree add -b feature/my-feature ../toolweb-my-feature
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
- **Payments**: Stripe Checkout + webhooks → see `.claude/skills/stripe-webhook.md`
- **Email**: Resend for transactional emails
- **Scheduling**: Cal.com embed
- **Animation**: GSAP + ScrollTrigger + Lenis smooth scroll
- **Styling**: Tailwind CSS

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
- `supabase/migrations/` — Database migrations
- `tests/` — Architecture invariant tests + unit tests
- `docs/style-guide.md` — Voice and copy guidelines

### Forge Dashboard (`src/pages/admin/forge/`)

5 admin pages reading from a separate Forge Supabase project. Config via `getForgeSupabase()` in `src/lib/env.ts`. Tables: `tasks`, `cost_log`, `judgments`.

### Key Patterns

- **Env vars**: All through `src/lib/env.ts` getters → `.claude/skills/cloudflare-pages.md`
- **Auth middleware** (`src/middleware.ts`): Protects `/admin/*` and `/portal/*`, cookie-based sessions
- **Stripe flow**: → `.claude/skills/stripe-webhook.md`
- **Query layer**: → `.claude/skills/supabase-queries.md`
- **Data model**: → `.claude/skills/data-model.md`

## Design

Reference: [hardsun.com](https://hardsun.com) — editorial scroll, full-bleed imagery, generous whitespace, 1px grid gaps, sticky bottom CTA.

CMYK accents: Cyan `#00FFFF` · Magenta `#FF00FF` · Yellow `#FFEB00`

Mobile-first (traffic from Instagram/LinkedIn links).

### Animation System (`src/scripts/animations.ts`)

GSAP + Lenis smooth scroll with `prefers-reduced-motion` bailout. Elements use `data-anim` attributes and CSS classes (`anim-fade-up`, `anim-fade`) for initial hidden state.

## Voice & Copy

See `docs/style-guide.md` for full reference. Key points:
- Direct, understated confidence, plain language
- A person, not an agency — never say "we" when it's one person
- Anti-patterns: marketing buzzwords, hedging, superlatives, filler enthusiasm

## Architecture Enforcement

Invariants are tested mechanically in `tests/architecture.test.ts`. Run with `pnpm test:arch`.

Current checks:
- **No banned Node.js imports** — `sharp`, `fs`, `child_process` (Cloudflare V8 constraint)
- **`import.meta.env` isolation** — only allowed in `cookies.ts`
- **R2 upload pattern** — `.stream()` rejected, must use `.arrayBuffer()`
- **wrangler.toml consistency** — non-inheritable keys verified across env blocks
- **Stripe metadata** — checkout endpoints must include `checkout_type`

## Testing

Vitest (unit/integration) + Playwright (E2E). Prioritize critical user flows (checkout, auth, portal access) over test count.

- Extract pure logic into `src/lib/` modules — import in both route handlers and tests
- For numeric boundaries: test exact boundary, one past boundary, zero state, corrupted state
- Never copy production logic into test files — import from real modules
- Verify float expectations with `node -e` before writing assertions
