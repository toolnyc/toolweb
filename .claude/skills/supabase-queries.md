# Supabase & Query Patterns

Load this skill when touching: `src/lib/queries.ts`, `src/lib/mutations.ts`, `src/lib/env.ts`, `src/middleware.ts`, `supabase/migrations/`, or any file that calls `.from()` / `.select()`.

## Dual Client Pattern

Configured in `src/lib/env.ts`, initialized in `src/middleware.ts` via `initClients()`:

- `getSupabase()` — anon key, respects RLS. Used for all public reads.
- `getSupabaseAdmin()` — service key, bypasses RLS. Used for server-side mutations and auth.
- `getSupabaseAdminOrNull()` — returns null if service key missing (graceful fallback).

**Secret key format**: The new `sb_secret_...` format does NOT bypass RLS when used with `@supabase/supabase-js` — PostgREST sees a non-JWT in the Authorization header and falls back to `anon` role. Use the legacy `service_role` JWT key (starts with `eyJ...`) for `SUPABASE_SECRET_KEY`.

## Query Layer (`src/lib/queries.ts`)

- All public reads use the anon client (RLS-scoped)
- Returns empty arrays on error, never throws
- Admin pages import `getSupabaseAdmin()` directly for full access

## PostgREST — Multiple Foreign Keys

**CRITICAL**: When adding a FK that creates a second relationship between two tables, you MUST update all existing queries.

PostgREST error `PGRST201: Could not embed because more than one relationship was found`. Fix:

```typescript
// Ambiguous (breaks with multiple FKs):
.select(`*, ticket_tiers (*)`)

// Explicit (works):
.select(`*, ticket_tiers!ticket_tiers_event_id_fkey (*)`)
```

Always test queries locally after adding FKs between already-linked tables.

## Don't Duplicate Business Logic

- DB queries (`.eq('status', 'published')`) are business logic — if the rule changes, every query must update
- Define status/visibility checks once in `src/lib/`, import everywhere
- When fixing a bug, grep for ALL instances of the pattern across the codebase

## Supabase CLI

Runs via `npx` (not globally installed):
```bash
npx supabase migration new <name>
npx supabase db push
npx supabase migration list
```

Requires `SUPABASE_ACCESS_TOKEN` env var. Single project `eknmuaffpvkiwylrybql` shared across preview and production — safe to push migrations anytime.
