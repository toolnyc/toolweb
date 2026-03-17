# Deploy Workflow

## Pre-deploy Checklist

1. **Type check**:
   ```bash
   pnpm astro check
   ```
   Must pass with 0 errors.

2. **Build**:
   ```bash
   pnpm build
   ```
   Must complete without errors.

3. **Run tests** (if they exist):
   ```bash
   pnpm test
   ```

4. **wrangler.toml audit** (if changed):
   - Check non-inheritable keys: if ANY of `vars`, `r2_buckets`, `kv_namespaces`, `d1_databases`, `durable_objects`, `services`, `queues`, `vectorize`, `hyperdrive`, `analytics_engine_datasets`, `ai` is overridden in an env block, ALL must be present
   - Compare top-level bindings against each `[env.*]` block

5. **Push to branch**:
   - `feature/*` → creates preview deploy at `pre.tool.nyc`
   - Merge to `master` → deploys to `tool.nyc` (production, live Stripe keys)

## Environments

| Branch | Domain | Stripe | Notes |
|--------|--------|--------|-------|
| `master` | `tool.nyc` | Live keys | Production |
| `preview` | `pre.tool.nyc` | Test keys | Staging |
| Feature branches | `*.toolweb-3si.pages.dev` | Test keys | Preview |

## Post-deploy

- If Stripe webhooks or Resend config changed: verify webhook endpoint in Stripe dashboard
- If migrations were pushed: already applied (single shared DB)
