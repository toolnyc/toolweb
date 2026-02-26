# Post-Mortem: The Great Env Var Refactor

## What Happened

Every page on the deployed site returned a 500 error. The worker crashed on startup with `Missing PUBLIC_SUPABASE_URL`. The site worked perfectly in local dev but was completely broken in production on Cloudflare Pages.

## Root Cause

All environment variables (database keys, Stripe keys, API keys) were read using `import.meta.env.*`, which is a **build-time** mechanism. Since the Cloudflare Pages build environment had no env vars configured, Vite inlined `undefined` for every single one. The worker started, immediately tried to create a Supabase client with `undefined` as the URL, and crashed.

---

## ELI5 Sections

### What's an environment variable?

Think of env vars like sticky notes you put on the fridge for your app. "Here's the database password." "Here's the Stripe key." They keep secrets out of your code so you don't accidentally commit `sk_live_supersecret` to GitHub.

### Build-time vs. runtime: the core of the problem

There are two moments an app can read those sticky notes:

**Build-time** = when the app is being compiled/packaged. The bundler (Vite) literally finds every `import.meta.env.THING` and replaces it with the actual value, baking it into the JavaScript. Like printing the sticky note directly into a book.

**Runtime** = when the app is actually running and handling a request. The code asks "hey, what's the database URL?" and the hosting platform hands it over on demand. Like reading the sticky note off the fridge when you need it.

### How Vercel does it

Vercel runs Node.js. In Node, `process.env` is available everywhere at runtime — it's just a big object the OS hands to your process. Vercel also supports `import.meta.env` because their build step injects the values.

So on Vercel, it basically doesn't matter which approach you use. Both work. You set env vars in the Vercel dashboard, and whether your code reads them at build-time or runtime, they're there. This is why tons of tutorials and starter templates use `import.meta.env` everywhere — it "just works" on Vercel.

### How Cloudflare does it (and why it's different)

Cloudflare Workers are **not Node.js**. They're V8 isolates — tiny sandboxed JavaScript environments with no `process.env`, no filesystem, no Node APIs. Think of them as browser tabs on a server.

Cloudflare gives you env vars in a completely different way: they're **bound to each incoming request**. When a request comes in, Cloudflare hands your worker an `env` object containing your vars. Before that first request? Your code has no access to them.

So the build step on Cloudflare Pages runs in a generic CI container that knows nothing about your secrets. Vite runs, sees `import.meta.env.SUPABASE_SECRET_KEY`, finds nothing, and bakes in `undefined`. The built JavaScript ships to Cloudflare's edge. A request comes in. The code tries to use `undefined` as a database URL. Boom — 500.

### Why did this require touching 30+ files?

Because `import.meta.env` was used **everywhere**. It wasn't just in one config file — it was the foundation of how three core libraries were initialized:

```
supabase.ts  →  imported by 18 admin pages, 6 API routes, middleware, queries, mutations
stripe.ts    →  imported by checkout + webhook
resend.ts    →  imported by emails + webhook
```

These three files created their clients at **module load time** (top-level code that runs when the file is first imported). That's the worst possible pattern for Cloudflare, because module-level code runs before any request exists, which means before any env vars are available.

The fix had to:

1. **Create a new system** (`env.ts`) that stores clients in module-scope variables but only initializes them lazily, when the first request triggers `initClients()`
2. **Update middleware** to call `initClients()` with the request's env on every request
3. **Update every single file** that imported the old modules — because the old modules no longer exist, and the new pattern requires calling a getter function (`getSupabaseAdmin()`) instead of importing a bare value (`supabaseAdmin`)

There was no way to do this incrementally. You can't half-migrate. The old files created clients eagerly; the new file creates them lazily. Every consumer had to switch.

### The diagram version

```
VERCEL (Node.js)
─────────────────────────────────
Build:   Vite bakes env vars into JS     ✅ (vars available in CI)
Runtime: process.env also works           ✅ (Node.js gives you this free)
Result:  Either approach works            👍

CLOUDFLARE (V8 Isolate)
─────────────────────────────────
Build:   Vite tries to bake env vars      ❌ (CI has no vars → undefined)
Runtime: env passed per-request            ✅ (but only if you use it!)
Result:  MUST use runtime env              👈 this is what we fixed
```

### Why didn't this show up in local dev?

Because locally, Vite reads your `.env` file and injects everything at build-time — which is exactly what `import.meta.env` expects. Your laptop is both the build environment and the runtime, so the distinction doesn't matter. The bug only manifests when build and runtime are separate machines (which is... production).

---

## What We Changed

| Before | After |
|---|---|
| 3 separate files (`supabase.ts`, `stripe.ts`, `resend.ts`) creating clients at import time | 1 file (`env.ts`) with lazy singleton pattern |
| `import.meta.env.SECRET` everywhere | `getEnv().SECRET` from runtime env |
| Module-level `const supabase = createClient(...)` | `initClients(env)` called from middleware on first request |
| Non-secret vars baked by Vite (works locally, breaks on CF) | Non-secret vars in `wrangler.toml [vars]`, secrets via `wrangler pages secret put` |
| `.env` file drove everything | `.dev.vars` for local dev, `wrangler.toml` + CF dashboard for prod |

## Lessons

1. **`import.meta.env` is a Vite-ism, not a platform guarantee.** It works great for truly public, build-time config (like `MODE` or `DEV`). For secrets or anything that varies by deployment, use the platform's native runtime env mechanism.
2. **Module-level side effects are a liability on edge runtimes.** If your module's top-level code creates a database client, that code runs before the platform has given you credentials. Lazy initialization with getter functions avoids this entirely.
3. **"Works on localhost" is the most dangerous test result.** The local dev server collapses build-time and runtime into one process, hiding an entire class of deployment bugs.
