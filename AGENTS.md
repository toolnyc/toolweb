> **Where things live** - Client: Tool internal | Bucket: (none - top-level `~/Code/`, moved out of `products/` 2026-10-07) | Dropbox: `_Clients/Tool_Internal/` | Registry: Notion "Repos" DB (IDs in `~/Code/toolhub/CoS/NOTION.md`)

@import /Users/pete/Code/.agent/conventions.md

# Tool.NYC — Agent Instructions

## Rules

- **Never work on `master`.** Create a worktree first; a pre-commit hook rejects commits to master.

  ```bash
  git worktree add -b feature/<name> ../toolweb-<name>
  cd ../toolweb-<name> && pnpm install
  ```

- **Stay scoped.** Fix/build what was asked. Don't refactor adjacent code or expand scope.

## Commands

```bash
pnpm dev            # Dev server
pnpm build          # Production build (Cloudflare Pages)
pnpm astro check    # Type-check .astro + .ts files
pnpm test           # Unit + architecture invariant tests
pnpm test:arch      # Architecture invariants only
```

## Stack

Creative consultancy site. Astro 5 full SSR (`output: 'server'`) on Cloudflare Pages (V8 isolates, not Node.js).

- **Database/auth**: Supabase Postgres, RLS, magic links for clients, password for admin
- **Storage**: Cloudflare R2 (media), Cloudflare Stream (video)
- **Payments**: Stripe Checkout + webhooks
- **Email**: Resend
- **Scheduling**: Cal.com embed
- **Animation**: GSAP + ScrollTrigger + Lenis (`src/scripts/animations.ts`, `prefers-reduced-motion` bailout)
- **Styling**: Tailwind CSS

Branches: `master` → tool.nyc (production, live Stripe keys), `preview` → pre.tool.nyc (staging, test keys).

## Directory Structure

- `src/lib/` — Service clients, queries, mutations, types. All env access through `env.ts` getters (lazy init from middleware).
- `src/pages/` — Public pages, `api/` (checkout, stripe-webhook, inquiry, upload, auth), `admin/` (dashboard incl. `forge/`, analytics, outreach, errors), `portal/` (client magic-link area), `work/`, `shop/`
- `src/middleware.ts` — Protects `/admin/*` and `/portal/*`, cookie-based sessions
- `src/components/`, `src/layouts/`, `src/scripts/`
- `supabase/migrations/` — Database migrations
- `tests/` — Architecture invariant tests + unit tests

Forge dashboard (`src/pages/admin/forge/`) reads a separate Forge Supabase project via `getForgeSupabase()` in `src/lib/env.ts`.

## Architecture Invariants

Enforced by `tests/architecture.test.ts`:

- No Node.js imports (`sharp`, `fs`, `child_process`) — V8 constraint
- `import.meta.env` only allowed in `cookies.ts`; everything else via `env.ts` getters
- R2 uploads must use `.arrayBuffer()`, never `.stream()`
- wrangler.toml consistency
- Checkout endpoints must include `checkout_type` in Stripe metadata

## Testing

Vitest + Playwright. Prioritize critical user flows over test count.

- Extract pure logic into `src/lib/`; import it in both route handlers and tests
- Never copy production logic into test files

## Design & Voice

Current design (pre-rebrand): hardsun.com-inspired editorial scroll, CMYK accents (cyan `#00FFFF` / magenta `#FF00FF` / yellow `#FFEB00`). A rebrand and rebuild are planned — treat design tokens and copy as subject to change.

Voice & style guide lives in Notion (Tool HQ → Voice & Style Guide). Core rule: a person, not an agency — never say "we" when it's one person.
