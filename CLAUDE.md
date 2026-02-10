# CLAUDE.md

## Critical Rules

1. **Worktree-only development.** Never commit to `master`. All work in worktrees:
   ```bash
   git worktree add -b feature/<name> ../toolweb-<name>
   cd ../toolweb-<name> && pnpm install
   ```
   Exception: trunk-based commits allowed during initial scaffolding (WS1) if explicitly told.

2. **Stay scoped.** Fix/build what was asked. Don't refactor adjacent code, add docstrings, or expand scope.

3. **PLAN.md is the source of truth** for schema, routes, workstreams, and design decisions. Read it before starting any workstream. Don't duplicate its content here.

4. **Reference codebase:** `../verbs/` — mature Astro 5 SSR app with same stack. Copy patterns from there (admin, auth middleware, Supabase clients, Stripe flow, file upload).

## Commands

```bash
pnpm dev            # Dev server
pnpm build          # Production build (Cloudflare Pages)
pnpm preview        # Preview production build
pnpm astro check    # Type-check .astro + .ts files
```

### Supabase

```bash
supabase migration new <name>   # Create migration
supabase db push                # Push to remote (preview)
supabase migration list         # Check status
```

Two environments (names TBD):
- **Preview** — linked by default, safe for testing migrations
- **Production** — only push after merge to master

## Stack

Astro 5 SSR → Cloudflare Pages · Supabase (Postgres + RLS + Auth) · Stripe · Cloudflare R2 · Resend · Bunny.net Stream · Cal.com · GSAP + Lenis · Tailwind

## Cloudflare Workers Constraints

This runs V8 isolates, NOT Node.js:
- **No Sharp** — client-side image compression before upload (`browser-image-compression`)
- **No `fs`** — file ops via R2 bindings only
- **No native Node modules** — Web API compatible libraries only
- Supabase JS + Stripe SDK work fine (both use fetch)

## Key Patterns

**Supabase dual clients** (same as verbs):
- `supabase` — anon key, respects RLS (public queries)
- `supabaseAdmin` — service key, bypasses RLS (server-side mutations)

**Auth**: Magic links for clients, password for admin. Middleware protects `/admin/*` and `/portal/*`.

**Stripe flow**: POST `/api/checkout` → Stripe session → webhook → idempotent order upsert via `stripe_session_id`.

**Stripe ↔ Resend coupling**: Purchase emails fire from webhook, not app code. Stale webhook endpoints poison idempotency. After any Resend/Stripe config change, verify the webhook in Stripe dashboard.

**PostgREST multiple FKs**: When two FKs exist between the same tables, ALL queries embedding either table must use explicit FK names (`!constraint_name`). See verbs CLAUDE.md for detailed example.

## Design

Reference: [hardsun.com](https://hardsun.com) — editorial scroll, full-bleed imagery, generous whitespace, 1px grid gaps, sticky bottom CTA.

CMYK accents: Cyan `#00FFFF` · Magenta `#FF00FF` · Yellow `#FFEB00`

Mobile-first (traffic from Instagram/LinkedIn links).

## Testing

Vitest (unit/integration) + Playwright (E2E). Prioritize critical user flows (checkout, auth, portal access) over test count.
