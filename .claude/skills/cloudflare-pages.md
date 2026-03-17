# Cloudflare Pages & R2 Patterns

Load this skill when touching: `wrangler.toml`, `src/pages/api/upload*.ts`, R2 operations, or adding new dependencies.

## V8 Isolate Constraints

This runs V8 isolates, NOT Node.js:

- **No Sharp** — use `browser-image-compression` client-side before upload
- **No `fs`** — file ops via R2 bindings only
- **No native Node modules** — Web API compatible libraries only
- Supabase JS + Stripe SDK work fine (both use fetch internally)

When adding a new dependency, verify it doesn't use Node.js built-ins (`fs`, `path`, `crypto` node module, `child_process`, etc.).

## R2 Uploads

Use `file.arrayBuffer()` not `file.stream()` for `R2Bucket.put()` — more reliable across runtimes.

```typescript
// Correct:
const buffer = await file.arrayBuffer();
await bucket.put(key, buffer);

// Unreliable:
await bucket.put(key, file.stream());
```

## wrangler.toml — Non-Inheritable Keys

**CRITICAL**: These keys are "non-inheritable" in Cloudflare Pages: `vars`, `r2_buckets`, `kv_namespaces`, `d1_databases`, `durable_objects`, `services`, `queues`, `vectorize`, `hyperdrive`, `analytics_engine_datasets`, `ai`.

If **any one** is overridden in `[env.preview]` or `[env.production]`, then **ALL** must be repeated — otherwise they're silently dropped.

This caused a production bug where `MEDIA_BUCKET` was at the top level but missing from preview deploys because `[env.preview.vars]` existed without `[[env.preview.r2_buckets]]`.

**Checklist when editing wrangler.toml:**
1. If adding/changing any non-inheritable key in an env block, verify ALL other non-inheritable keys are present in that block
2. Compare top-level bindings against each `[env.*]` block
3. Test with `wrangler pages dev` before pushing

Docs: https://developers.cloudflare.com/pages/functions/wrangler-configuration/

## Env Var Architecture

All custom env vars read from `Astro.locals.runtime.env` via lazy singletons in `src/lib/env.ts`:

- `import.meta.env` only used for Vite built-ins (`PROD`, `DEV`, `MODE`) in `cookies.ts`
- Non-secrets: `wrangler.toml [vars]` (split prod/preview sections)
- Secrets: `wrangler pages secret put` (both environments)
- Local dev: `.dev.vars` file
- Exported getters: `getSupabase()`, `getSupabaseAdmin()`, `getStripe()`, `getResendOrNull()`, `getEnv()`

**Never** access env vars directly from `context.locals.runtime.env` outside `src/lib/env.ts`. Always use the exported getters.
