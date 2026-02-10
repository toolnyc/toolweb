# Tool.NYC — Implementation Plan

> Full-service creative technical consultancy. Astro 5 SSR, Supabase, Stripe, Cloudflare Pages.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack (Definitive)](#2-tech-stack)
3. [Dependency Graph & Build Order](#3-dependency-graph)
4. [Database Schema](#4-database-schema)
5. [Site Map & Route Table](#5-site-map)
6. [Workstream 1: Infrastructure & Scaffolding](#ws1)
7. [Workstream 2: Database & Backend Services](#ws2)
8. [Workstream 3: API Layer](#ws3)
9. [Workstream 4: Auth & Middleware](#ws4)
10. [Workstream 5: Admin Dashboard](#ws5)
11. [Workstream 6: Public Frontend & Design](#ws6)
12. [Workstream 7: Client Portal](#ws7)
13. [Testing Strategy](#8-testing)
14. [Design Reference](#9-design-reference)
15. [Open Decisions](#10-open-decisions)

---

## 1. Project Overview <a name="1-project-overview"></a>

**Tool** (tool.nyc) is a full-service creative technical consultancy run by a solo operator. The website serves as:

- **A mood board portfolio** — editorial scroll experience showcasing graphic design, motion, and web work
- **An inbound sales funnel** — sticky "Work with us" CTA → Cal.com scheduling
- **A client portal** — magic link auth, project status, deliverables, invoices
- **A merch shop** — occasional drops with countdown timers, flat-rate shipping

### Design Philosophy

Emulates [hardsun.com](https://hardsun.com): linear scroll narrative, full-bleed imagery, generous whitespace, editorial text/image separation, 1px grid gaps, expandable accordion sections, sticky bottom CTA bar. The site should feel **cool first, then technically solid.**

### Key Constraints

- Solo operator, 2-3 active clients at a time
- Must be easy to update (admin dashboard, not CLI)
- Mobile-first (traffic expected from Instagram/LinkedIn links)
- Off big tech where practical (Cloudflare over AWS)
- Cost-conscious (no expensive SaaS for 2-3 clients)

### User Workflows (Derived from Discovery)

**Inbound sales flow**: Visitor lands (via referral, LinkedIn, Instagram) → scrolls mood board → clicks "Work with us" → books Cal.com call → discovery call → proposal (Markdown, sent via email for now) → contract signing (DocuSeal, Phase 3) → client portal access (auto magic link invite) → project kickoff.

**Client experience**: Logs into portal via magic link → sees project status (Discovery → Proposal → Active → Review → Complete) → clicks Dropbox link for deliverables → pays invoices via embedded Stripe link → retains access after project wraps.

**Admin workflow**: Logs into /admin → manages portfolio (upload images/videos from machine) → updates writing snippets → creates clients (auto-sends magic link) → creates projects, updates status → manages merch drops (set drop date, countdown timer) → views inquiry inbox → manages orders (mark shipped, add tracking).

**Content available**: Existing backlog of portfolio work ready to upload (~10-15 pieces), Tool branding assets (CMYK-based), ~10 client names. Content mix: ~50% static images, ~25% motion/video, ~25% web project links. Writing snippets to be written fresh.

**Social media (Phase 3)**: Push-only model — when new portfolio work is added, generate shareable assets for LinkedIn and Instagram (short-form video content, personality-driven). Both are Tool-branded accounts, not yet active. Integration via Buffer or direct API in future workstream.

### Reference Codebase

The `verbs/` project is a mature Astro 5 SSR app with the same stack (Supabase + Stripe + custom admin). Patterns from Verbs should be replicated where applicable. Key files:
- Admin dashboard pattern: `verbs/src/pages/admin/`
- Auth middleware: `verbs/src/middleware.ts`
- Supabase client: `verbs/src/lib/supabase.ts`
- Stripe integration: `verbs/src/lib/stripe.ts`
- File upload: `verbs/src/pages/api/upload.ts` + `verbs/src/lib/blob.ts`
- Database schema: `verbs/supabase/schema.sql`

---

## 2. Tech Stack (Definitive) <a name="2-tech-stack"></a>

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | **Astro 5** (`output: 'server'`) | SSR mode for dynamic routes (portal, admin, API) |
| Adapter | **@astrojs/cloudflare** | Cloudflare Pages Workers runtime |
| Styling | **Tailwind CSS 3.4** | Utility-first CSS |
| Animation | **GSAP + Lenis** | Smooth scroll + scroll-triggered animations |
| Database | **Supabase** (PostgreSQL) | Auth, DB, RLS policies |
| Payments | **Stripe** | Merch checkout + invoice embedding |
| Media Storage | **Cloudflare R2** | S3-compatible, no egress fees |
| Video Hosting | **Bunny.net Stream** (portfolio) + **R2** (short clips) | Indie, cheap, good player |
| Email | **Resend** | Transactional emails (magic links, order confirmations, intake notifications) |
| Scheduling | **Cal.com** (hosted free plan) | Embedded via iframe on /book |
| Contract Signing | **DocuSeal** (API integration) | Open source e-signatures |
| Hosting | **Cloudflare Pages** | Free tier, global CDN, Workers runtime |
| Package Manager | **pnpm** | Fast, disk-efficient |
| Testing | **Vitest** (unit/integration) + **Playwright** (E2E) | |

### Cloudflare Workers Runtime Constraints

Cloudflare Pages runs V8 isolates, NOT Node.js. This means:
- **No Sharp** — image optimization must happen client-side before upload (use `browser-image-compression`)
- **No `fs` module** — all file operations via R2 bindings
- **No native Node modules** — use Web API compatible libraries
- Supabase JS client works fine (uses fetch)
- Stripe SDK works fine (uses fetch)

---

## 3. Dependency Graph & Build Order <a name="3-dependency-graph"></a>

```
Phase A (Sequential — Foundation)
═══════════════════════════════════
  WS1: Infrastructure ──→ WS2: Database Schema
                               │
Phase B (Parallel — Services)  │
═══════════════════════════════ │
                               ├──→ WS3: API Layer
                               └──→ WS4: Auth & Middleware
                                        │
Phase C (Parallel — UI)                 │
═══════════════════════════════         │
                               ┌────────┤
                               ├──→ WS5: Admin Dashboard
                               ├──→ WS6: Public Frontend (can start with mock data earlier)
                               └──→ WS7: Client Portal
```

**Parallelization notes:**
- WS3 and WS4 have no dependencies on each other — run in parallel
- WS5, WS6, WS7 have no dependencies on each other — run in parallel
- WS6 (design) can begin during Phase A using hardcoded mock data, then wire up to real data in Phase C
- Testing is embedded in each workstream, not a separate phase

---

## 4. Database Schema <a name="4-database-schema"></a>

### Enums

```sql
CREATE TYPE portfolio_category AS ENUM ('motion', 'graphic', 'web', 'brand');
CREATE TYPE portfolio_media_type AS ENUM ('image', 'video');
CREATE TYPE display_size AS ENUM ('small', 'medium', 'large');
CREATE TYPE content_status AS ENUM ('draft', 'published');
CREATE TYPE product_status AS ENUM ('draft', 'upcoming', 'active', 'sold_out');
CREATE TYPE order_status AS ENUM ('paid', 'shipped', 'delivered', 'refunded');
CREATE TYPE client_status AS ENUM ('active', 'inactive');
CREATE TYPE project_status AS ENUM ('inquiry', 'discovery', 'proposal', 'active', 'review', 'complete');
CREATE TYPE inquiry_status AS ENUM ('new', 'reviewed', 'converted', 'declined');
```

### Tables

#### `portfolio_items` — Work samples on the mood board

```sql
CREATE TABLE portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,                           -- Short caption, optional
  category portfolio_category NOT NULL,
  media_url TEXT NOT NULL,                    -- R2 URL (image) or Bunny embed URL (video)
  media_type portfolio_media_type NOT NULL DEFAULT 'image',
  thumbnail_url TEXT,                         -- For video items, a still frame
  external_url TEXT,                          -- For web projects, link to live site
  display_size display_size NOT NULL DEFAULT 'medium',
  sort_order INT NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_status ON portfolio_items(status);
CREATE INDEX idx_portfolio_sort ON portfolio_items(sort_order);
```

#### `writing_snippets` — Short text interspersed in the mood board

```sql
CREATE TABLE writing_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,                      -- The snippet text
  attribution TEXT,                           -- Optional source/credit
  sort_order INT NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `client_logos` — Client name list for homepage

```sql
CREATE TABLE client_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `clients` — Portal users (active/past clients)

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  company TEXT,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),  -- Supabase Auth link
  status client_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_auth ON clients(auth_user_id);
```

#### `projects` — Client projects with status tracking

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'discovery',
  deliverables_url TEXT,                      -- Dropbox shared folder link (Phase 1)
  stripe_invoice_id TEXT,                     -- Stripe Invoice ID
  stripe_invoice_url TEXT,                    -- Stripe hosted invoice URL
  notes TEXT,                                 -- Internal admin notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
```

#### `project_inquiries` — Public intake form submissions

```sql
CREATE TABLE project_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  project_type TEXT,                          -- Free text: "branding", "website", "both", etc.
  description TEXT NOT NULL,
  budget_range TEXT,                          -- e.g., "$5k-$10k", "$10k-$25k"
  timeline TEXT,                              -- e.g., "1 month", "3 months", "flexible"
  status inquiry_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inquiries_status ON project_inquiries(status);
```

#### `products` — Merch items

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,                     -- Base price in dollars
  image_url TEXT,                             -- R2 URL
  stripe_product_id TEXT,
  drop_date TIMESTAMPTZ,                      -- Nullable: if set, show countdown
  status product_status NOT NULL DEFAULT 'draft',
  shipping_domestic NUMERIC NOT NULL DEFAULT 5,    -- Flat rate domestic
  shipping_international NUMERIC NOT NULL DEFAULT 15, -- Flat rate international
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `product_variants` — Size/color options

```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                        -- "S", "M", "L", "XL"
  stock_count INT NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
```

#### `orders` — Merch purchases

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  product_variant_id UUID REFERENCES product_variants(id),
  stripe_session_id TEXT UNIQUE NOT NULL,     -- Idempotency key
  stripe_payment_intent_id TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  shipping_address JSONB NOT NULL,            -- {line1, line2, city, state, postal_code, country}
  quantity INT NOT NULL DEFAULT 1,
  amount_paid NUMERIC NOT NULL,
  shipping_cost NUMERIC NOT NULL,
  status order_status NOT NULL DEFAULT 'paid',
  tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_session ON orders(stripe_session_id);
CREATE INDEX idx_orders_status ON orders(status);
```

#### `site_content` — Editable site copy

```sql
CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT UNIQUE NOT NULL,           -- e.g., 'hero_tagline', 'about_blurb'
  title TEXT,
  content TEXT NOT NULL,
  content_group TEXT,                         -- e.g., 'homepage', 'footer', 'meta'
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RLS Policies

| Table | Public Read | Authenticated Client Read | Admin (service role) |
|-------|------------|---------------------------|---------------------|
| portfolio_items | status = 'published' | same | Full access |
| writing_snippets | status = 'published' | same | Full access |
| client_logos | is_visible = true | same | Full access |
| clients | No | Own record only (auth_user_id match) | Full access |
| projects | No | Own projects only (client_id match) | Full access |
| project_inquiries | No | No | Full access |
| products | status IN ('active','upcoming') | same | Full access |
| product_variants | parent product is active | same | Full access |
| orders | No | No | Full access |
| site_content | Yes | Yes | Full access |

---

## 5. Site Map & Route Table <a name="5-site-map"></a>

### Public Pages

| Route | Page | Description | Auth |
|-------|------|-------------|------|
| `/` | Homepage | Mood board scroll: hero → portfolio grid → writing → client list → CTA | None |
| `/book` | Booking | Cal.com scheduling embed, full page | None |
| `/shop` | Merch Store | Active drops with countdown, "nothing available" empty state | None |
| `/shop/[id]` | Product Detail | Product images, variant selector, shipping info, checkout button | None |
| `/inquiry` | Project Intake | Public form: name, email, company, project type, description, budget, timeline | None |
| `/inquiry/thanks` | Confirmation | "Thanks, I'll be in touch within 48 hours" | None |
| `/success` | Purchase Confirmation | Post-checkout thank you with order details | None |

### Client Portal

| Route | Page | Description | Auth |
|-------|------|-------------|------|
| `/portal` | Portal Login | Email input → sends magic link | None |
| `/portal/dashboard` | Client Dashboard | Active projects, status, deliverables links, invoices | Magic link |
| `/portal/verify` | Magic Link Callback | Validates token, sets session, redirects to dashboard | Token |

### Admin Dashboard

| Route | Page | Description | Auth |
|-------|------|-------------|------|
| `/admin` | Dashboard Home | Overview: active projects, recent inquiries, pending orders | Password |
| `/admin/login` | Admin Login | Email/password form | None |
| `/admin/portfolio` | Portfolio List | Grid of all items, filter by status/category, reorder | Password |
| `/admin/portfolio/new` | New Portfolio Item | Upload media, set category/size/title, save as draft | Password |
| `/admin/portfolio/[id]` | Edit Portfolio Item | Edit all fields, replace media, publish/unpublish | Password |
| `/admin/writing` | Writing Snippets | List all, inline edit, reorder, create new | Password |
| `/admin/clients` | Client List | All clients, status filter, "invite" button | Password |
| `/admin/clients/new` | New Client | Name, email, company → creates record + sends magic link | Password |
| `/admin/clients/[id]` | Client Detail | Edit info, view their projects, add new project | Password |
| `/admin/projects/[id]` | Project Detail | Update status, set deliverables URL, attach Stripe invoice | Password |
| `/admin/inquiries` | Inquiry Inbox | List all submissions, mark reviewed/converted/declined | Password |
| `/admin/shop` | Product List | All merch, status filter | Password |
| `/admin/shop/new` | New Product | Name, price, image, variants, drop date, shipping rates | Password |
| `/admin/shop/[id]` | Edit Product | All fields, manage variants/stock, publish/schedule | Password |
| `/admin/orders` | Order List | All orders, filter by status, update tracking | Password |
| `/admin/orders/[id]` | Order Detail | Customer info, shipping address, mark shipped, add tracking | Password |
| `/admin/site` | Site Content | Edit hero tagline, about text, footer content, etc. | Password |

### API Routes

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/api/upload` | POST | Upload media to R2. Returns public URL. | Admin session |
| `/api/checkout` | POST | Create Stripe Checkout session for merch. Accepts variant ID, quantity, shipping country. | None |
| `/api/stripe-webhook` | POST | Handles `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`. | Stripe signature |
| `/api/inquiry` | POST | Saves intake form to DB, sends notification email via Resend. | None (rate limited) |
| `/api/auth/magic-link` | POST | Sends magic link to client email via Supabase Auth. | None |
| `/api/auth/callback` | GET | Validates magic link token, sets session cookie, redirects. | Token |
| `/api/auth/admin-login` | POST | Validates admin email/password via Supabase Auth. | None |
| `/api/auth/logout` | POST | Clears session cookies. | Any |

---

## Workstream 1: Infrastructure & Scaffolding <a name="ws1"></a>

**Agent type**: DevOps / infrastructure specialist
**Estimated scope**: Small (~15 tasks)

### Tasks

1. **Initialize Astro 5 project with SSR + Cloudflare adapter**
   - `pnpm create astro@latest` with TypeScript, strict mode
   - Configure `output: 'server'` in `astro.config.mjs`
   - Install `@astrojs/cloudflare` adapter and `@astrojs/tailwind`
   - Create `wrangler.toml` for Cloudflare Pages config
   - Install core dependencies: `@supabase/supabase-js`, `stripe`, `gsap`, `lenis`, `resend`

2. **Set up Supabase project**
   - Create new Supabase project for Tool
   - Initialize Supabase CLI locally (`supabase init`)
   - Configure environment variables (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY)

3. **Set up Cloudflare R2 bucket**
   - Create R2 bucket named `tool-media`
   - Configure public access via custom domain or R2.dev URL
   - Set up CORS policy for upload from admin
   - Add R2 binding to `wrangler.toml`

4. **Set up Resend**
   - Create Resend account, verify tool.nyc domain
   - Create API key, add to environment variables

5. **Set up testing framework**
   - Add Vitest for unit/integration tests
   - Add Playwright for E2E tests
   - Create `vitest.config.ts` and `playwright.config.ts`
   - Add test scripts to `package.json`

6. **Configure environment variables**
   - Update `.env.example` with all required vars
   - Document which vars are `PUBLIC_` (client-safe) vs server-only

7. **Set up Cloudflare Pages deployment**
   - Connect git repository to Cloudflare Pages
   - Configure build settings (pnpm build)
   - Add environment variables in CF dashboard
   - Verify deployment works with basic page

8. **DNS configuration**
   - Point tool.nyc to Cloudflare Pages
   - Set up www redirect

### Success Criteria

- [ ] `pnpm dev` starts Astro dev server in SSR mode without errors
- [ ] `pnpm build` produces valid Cloudflare Pages output
- [ ] Supabase client connects successfully from server-side code
- [ ] R2 upload/download works from API route
- [ ] Resend can send test email from API route
- [ ] `pnpm test` runs Vitest with passing placeholder test
- [ ] Deployed to Cloudflare Pages at tool.nyc
- [ ] HTTPS working on tool.nyc

### Tests

```
tests/
  infrastructure/
    supabase-connection.test.ts    — Can connect, query returns no error
    r2-upload.test.ts              — Can put/get object in R2
    resend-send.test.ts            — Can send test email (integration, skip in CI)
    env-vars.test.ts               — All required env vars are defined
```

---

## Workstream 2: Database & Backend Services <a name="ws2"></a>

**Agent type**: Backend / database specialist
**Depends on**: WS1 (Supabase project exists)
**Estimated scope**: Medium (~20 tasks)

### Tasks

1. **Write initial migration** (`supabase/migrations/00001_init.sql`)
   - All tables from Section 4 above
   - All enums
   - All indexes
   - All RLS policies

2. **Create Supabase client module** (`src/lib/supabase.ts`)
   - Public client (anon key, respects RLS)
   - Admin client (service key, bypasses RLS)
   - Follow dual-client pattern from Verbs (`verbs/src/lib/supabase.ts`) for reference

3. **Create TypeScript types** (`src/lib/types.ts`)
   - Type for every table row (insert + select variants)
   - Enum types matching database enums

4. **Create query helpers** (`src/lib/queries.ts`)
   - `getPublishedPortfolio()` — returns published items ordered by sort_order
   - `getPublishedWriting()` — returns published snippets ordered by sort_order
   - `getVisibleClients()` — returns visible client names
   - `getActiveProducts()` — returns active products with variants
   - `getProductById(id)` — returns product with variants
   - `getClientByAuthId(authUserId)` — returns client record
   - `getProjectsByClientId(clientId)` — returns client's projects
   - `getNewInquiries()` — returns unreviewed inquiries
   - `getRecentOrders()` — returns recent orders with product info
   - `getSiteContent(group)` — returns content by group

5. **Create seed data** (`supabase/seed.sql`)
   - 5 sample portfolio items (mix of categories and sizes)
   - 3 writing snippets
   - 5 client names
   - 1 sample product with 4 size variants
   - 1 sample client with 1 project
   - Site content entries (hero_tagline, about_blurb, footer_text)

6. **Create mutation helpers** (`src/lib/mutations.ts`)
   - CRUD for portfolio_items
   - CRUD for writing_snippets
   - CRUD for clients (+ trigger magic link invite)
   - CRUD for projects
   - Status updates for inquiries
   - CRUD for products + variants
   - Order creation (from webhook)
   - Order status updates (shipped, tracking)

### Success Criteria

- [ ] Migration runs cleanly on fresh Supabase project
- [ ] All RLS policies work: public can read published content, clients see only their data, service role has full access
- [ ] TypeScript types compile with no errors
- [ ] All query helpers return correctly shaped data
- [ ] Seed data loads without errors
- [ ] A client auth_user_id can only access their own projects (tested)

### Tests

```
tests/
  database/
    schema.test.ts                 — Tables exist with correct columns
    rls-policies.test.ts           — Public read, client isolation, admin bypass
    queries.test.ts                — All query helpers return expected shapes
    mutations.test.ts              — CRUD operations succeed and validate
    seed.test.ts                   — Seed data loads and is queryable
```

---

## Workstream 3: API Layer <a name="ws3"></a>

**Agent type**: Backend specialist
**Depends on**: WS2 (schema + query helpers exist)
**Runs in parallel with**: WS4

### Tasks

1. **POST `/api/upload`** — Media upload to R2
   - Accept multipart form data (image or video file)
   - Validate file type (jpg, png, webp, gif, mp4)
   - Validate file size (images: 10MB max, video: 100MB max)
   - Generate unique filename with timestamp
   - Upload to R2 bucket
   - Return public URL
   - Require admin auth (check cookie)
   - Note: NO server-side image optimization (Sharp unavailable on CF Workers). Client must optimize before upload.

2. **POST `/api/checkout`** — Stripe merch checkout
   - Accept: `{ variantId, quantity, shippingCountry }`
   - Validate variant exists and has stock
   - Look up flat shipping rate (domestic if US, international otherwise)
   - Create Stripe Checkout Session with:
     - Line item (variant's stripe_price_id × quantity)
     - Shipping cost as separate line item
     - `shipping_address_collection` enabled
     - Success/cancel URLs
   - Return `{ url: session.url }`

3. **POST `/api/stripe-webhook`** — Webhook handler
   - Verify Stripe signature
   - Handle `checkout.session.completed`:
     - Extract shipping address, customer info
     - Create order record (idempotent on stripe_session_id)
     - Decrement variant stock_count
     - Send order confirmation email via Resend
   - Handle `invoice.paid`:
     - Update project's invoice status if linked
   - Handle `invoice.payment_failed`:
     - Send notification email to admin

4. **POST `/api/inquiry`** — Public intake form
   - Accept form data: name, email, company, project_type, description, budget_range, timeline
   - Validate required fields (name, email, description)
   - Basic rate limiting (5 per hour per IP via CF headers)
   - Insert into project_inquiries table
   - Send notification email to admin via Resend (with inquiry details)
   - Return success response

5. **POST `/api/auth/magic-link`** — Client magic link
   - Accept: `{ email }`
   - Verify email exists in clients table
   - Send magic link via Supabase Auth `signInWithOtp({ email })`
   - Return success (don't reveal whether email exists — always say "check your email")

6. **GET `/api/auth/callback`** — Magic link verification
   - Extract token from URL params
   - Verify via Supabase Auth `verifyOtp()`
   - Set session cookies (access_token, refresh_token as HttpOnly cookies)
   - Redirect to `/portal/dashboard`

7. **POST `/api/auth/admin-login`** — Admin password auth
   - Accept: `{ email, password }`
   - Authenticate via Supabase Auth `signInWithPassword()`
   - Set session cookies
   - Return success/redirect

8. **POST `/api/auth/logout`** — Clear session
   - Clear auth cookies
   - Redirect to `/`

### Success Criteria

- [ ] Upload endpoint accepts files, stores in R2, returns valid URL
- [ ] Upload rejects unauthorized requests (no admin cookie)
- [ ] Checkout creates valid Stripe session with correct amounts
- [ ] Checkout rejects out-of-stock variants
- [ ] Webhook is idempotent (processing same event twice creates only one order)
- [ ] Webhook correctly decrements stock
- [ ] Inquiry form saves to DB and sends email notification
- [ ] Inquiry rate limiting works (6th request in an hour returns 429)
- [ ] Magic link flow works end-to-end (send → click → session set → redirect)
- [ ] Admin login works end-to-end
- [ ] Logout clears all cookies

### Tests

```
tests/
  api/
    upload.test.ts                 — File validation, auth check, R2 integration
    checkout.test.ts               — Session creation, stock validation, shipping calc
    webhook.test.ts                — Signature validation, idempotency, stock decrement
    inquiry.test.ts                — Validation, rate limiting, email send
    auth-magic-link.test.ts        — Send flow, callback flow, cookie setting
    auth-admin.test.ts             — Login, logout, invalid credentials
```

---

## Workstream 4: Auth & Middleware <a name="ws4"></a>

**Agent type**: Backend specialist
**Depends on**: WS2 (clients table + Supabase Auth)
**Runs in parallel with**: WS3

### Tasks

1. **Admin auth middleware** (`src/middleware.ts`)
   - Protect all `/admin/*` routes except `/admin/login`
   - Read access_token and refresh_token from cookies
   - Validate via `supabaseAdmin.auth.getUser(accessToken)`
   - Auto-refresh expired tokens
   - Store user in `Astro.locals.user`
   - Redirect to `/admin/login` if invalid
   - Reference `verbs/src/middleware.ts` for the cookie-based auth pattern

2. **Client auth middleware** (same file, separate logic path)
   - Protect all `/portal/*` routes except `/portal` (login page) and `/portal/verify`
   - Same token validation as admin
   - Additionally: look up `clients` record by `auth_user_id`
   - Store client record in `Astro.locals.client`
   - Redirect to `/portal` if invalid
   - If client.status === 'inactive', show "account inactive" message

3. **Cookie helpers** (`src/lib/cookies.ts`)
   - `setAuthCookies(response, accessToken, refreshToken)` — Set HttpOnly, Secure, SameSite=Lax cookies
   - `clearAuthCookies(response)` — Clear cookies
   - `getAuthTokens(request)` — Read tokens from cookies

4. **Astro locals type definition** (`src/env.d.ts`)
   - Extend `App.Locals` with `user` and `client` fields
   - Type-safe access in all Astro pages

### Success Criteria

- [ ] Unauthenticated GET to `/admin` redirects to `/admin/login`
- [ ] Unauthenticated GET to `/portal/dashboard` redirects to `/portal`
- [ ] Authenticated admin can access all `/admin/*` routes
- [ ] Authenticated client can access `/portal/dashboard`
- [ ] Client A cannot see Client B's data (verified by RLS + middleware)
- [ ] Expired tokens are auto-refreshed without user action
- [ ] Inactive clients see appropriate message, not dashboard

### Tests

```
tests/
  middleware/
    admin-auth.test.ts             — Protection, redirect, token refresh
    client-auth.test.ts            — Protection, client isolation, inactive handling
    cookies.test.ts                — Set, get, clear cookie helpers
```

---

## Workstream 5: Admin Dashboard <a name="ws5"></a>

**Agent type**: Full-stack agent
**Depends on**: WS2, WS3, WS4
**Runs in parallel with**: WS6, WS7

### Design Notes

Follow the admin UI pattern established in Verbs (see `verbs/src/pages/admin/` for reference):
- Server-side form processing (POST to Astro pages, no client-side JS frameworks)
- `Admin.astro` layout with sidebar nav
- Clean, functional UI (not pretty — efficient)
- Mobile-responsive sidebar (collapses to hamburger)

### Tasks

1. **Admin layout** (`src/layouts/Admin.astro`)
   - Sidebar: Dashboard, Portfolio, Writing, Clients, Inquiries, Shop, Orders, Site Content
   - Mobile hamburger menu
   - Logged-in user indicator
   - Logout button
   - Reference `verbs/src/layouts/Admin.astro` for structural pattern

2. **Admin login page** (`src/pages/admin/login.astro`)
   - Email + password form
   - POST to `/api/auth/admin-login`
   - Error display

3. **Admin dashboard home** (`src/pages/admin/index.astro`)
   - Active projects count + list
   - New inquiries count (badge)
   - Pending orders count
   - Recent activity feed

4. **Portfolio management** (`src/pages/admin/portfolio/`)
   - `index.astro` — Grid/list of all items, filter by status/category, sortable
   - `new.astro` — Create form with media upload component
   - `[id].astro` — Edit form, replace media, change status

5. **Writing snippets management** (`src/pages/admin/writing/`)
   - `index.astro` — List all, inline create, reorder (drag or sort_order input)
   - Inline edit (click to edit, save on blur/enter)

6. **Client management** (`src/pages/admin/clients/`)
   - `index.astro` — List all clients, status filter, "Invite New Client" button
   - `new.astro` — Name, email, company → creates client record + triggers magic link email
   - `[id].astro` — Edit client info, list their projects, "Add Project" button

7. **Project management** (`src/pages/admin/projects/[id].astro`)
   - Update status (dropdown: inquiry → discovery → proposal → active → review → complete)
   - Set deliverables URL (text input for Dropbox link)
   - Attach Stripe invoice (input Stripe invoice ID, auto-fetch hosted URL)
   - Internal notes (textarea)

8. **Inquiry inbox** (`src/pages/admin/inquiries/`)
   - `index.astro` — List all, filter by status (new/reviewed/converted/declined)
   - Click to expand details inline
   - Action buttons: Mark Reviewed, Convert to Client (creates client + project), Decline

9. **Shop management** (`src/pages/admin/shop/`)
   - `index.astro` — Product list, status filter
   - `new.astro` — Product form with image upload, variant management, drop date picker, shipping rates
   - `[id].astro` — Edit all fields, manage variant stock

10. **Order management** (`src/pages/admin/orders/`)
    - `index.astro` — All orders, filter by status (paid/shipped/delivered)
    - `[id].astro` — View details, update status to shipped, add tracking number

11. **Site content management** (`src/pages/admin/site/index.astro`)
    - List all content entries grouped by content_group
    - Inline edit (textarea for content, text input for title)

12. **FileUpload component** (`src/components/admin/FileUpload.astro`)
    - Client-side image optimization using `browser-image-compression` before upload (Sharp unavailable on CF Workers)
    - Convert to WebP, max 1920px, quality 80
    - Progress indicator
    - Preview after upload
    - Posts to `/api/upload`
    - Reference `verbs/src/components/admin/FileUpload.astro` for UX pattern (adapt for client-side optimization)

### Success Criteria

- [ ] Admin can log in and see dashboard with real data
- [ ] Admin can create a portfolio item with uploaded image and it appears on the homepage
- [ ] Admin can create a writing snippet and it appears on the homepage
- [ ] Admin can create a client, client receives magic link email
- [ ] Admin can create a project for a client and update its status
- [ ] Admin can view inquiry, convert it to client + project in one action
- [ ] Admin can create a product with variants, set a drop date
- [ ] Admin can view orders and update shipping status with tracking number
- [ ] Admin can edit site content and changes reflect on the public site
- [ ] File upload works with client-side optimization (images under 500KB after processing)
- [ ] All admin pages are mobile-responsive

### Tests

```
tests/
  admin/
    portfolio-crud.test.ts         — Create, read, update, delete portfolio items
    client-management.test.ts      — Create client, send invite, convert inquiry
    project-management.test.ts     — Status updates, deliverables URL, invoice attach
    shop-crud.test.ts              — Product + variant CRUD, stock management
    order-management.test.ts       — Status updates, tracking number
    file-upload.test.ts            — Client-side optimization, R2 upload, URL return

  e2e/
    admin-portfolio-flow.spec.ts   — Login → create item → verify on homepage
    admin-client-flow.spec.ts      — Create client → create project → update status
    admin-shop-flow.spec.ts        — Create product → set live → verify on /shop
```

---

## Workstream 6: Public Frontend & Design <a name="ws6"></a>

**Agent type**: Design / frontend specialist
**Depends on**: WS2 (for data), but can start with mock data during Phase A
**Runs in parallel with**: WS5, WS7

### Design Reference: Hardsun.com

**Key patterns to replicate from Hardsun:**
- Linear scroll narrative (no multi-page navigation for main content)
- 1px gap grid system (CSS Grid with `gap: 1px; background: #e5e5e5`, children get white bg)
- Full-bleed imagery with generous whitespace (60-100px vertical gaps)
- Text strictly separated from images (not overlaid)
- Expandable accordion sections ("+" indicator that toggles to "−")
- Sticky bottom CTA bar (fixed position, full width, persistent)
- Minimal nav header (logo left, minimal links right)
- Warm, confident, unhurried pacing
- Mobile: single column, full-width images, stacked sections

**Tool-specific adaptations:**
- CMYK accent colors (cyan #00FFFF, magenta #FF00FF, yellow #FFEB00)
- Variable-size portfolio grid (small/medium/large items in masonry-like layout)
- Writing snippets interspersed between portfolio rows
- Client name list as a simple text section
- "Work with us" sticky bar replacing Hardsun's "Add to bag"
- Video items play inline on hover/tap (short clips) or show Bunny.net embed
- Content mix: ~50% static images, ~25% motion/video, ~25% web project links

### Tasks

1. **Base layout** (`src/layouts/BaseLayout.astro`)
   - HTML document structure, meta tags, OG/social sharing tags
   - GSAP + Lenis script loading
   - Font loading (system font stack or specific typeface — see Open Decisions)
   - Viewport meta for mobile
   - Global CSS import

2. **Header component** (`src/components/Header.astro`)
   - Tool wordmark/logo (left)
   - Minimal links: Shop, Book (right)
   - Mobile: same, no hamburger needed (only 2 links)
   - Thin, doesn't compete with content

3. **Homepage mood board** (`src/pages/index.astro` + `src/components/Moodboard.astro`)
   - **Hero section**: Bold statement/tagline (from site_content). Full viewport height. Tool logo prominent. Minimal text. Sets the tone.
   - **Portfolio grid**: Variable-size masonry layout. Items tagged small/medium/large get different grid spans. Mix of:
     - Static images (most common)
     - Inline video clips (autoplay muted, loop — for motion work)
     - Web project cards (title + link out icon)
   - **Writing snippets**: Interspersed between portfolio rows. Full-width text blocks with generous padding. Different typography treatment (larger, more space).
   - **Client list**: Simple text list of client names. Could be a single row or a minimal grid. Understated.
   - **About/services blurb**: Short section establishing "full-service creative technical consultancy" — branding + software dev. 1-2 sentences max.
   - **Sticky CTA bar**: Fixed to bottom. "Work with us" button (right-aligned, black bg). Possibly shows Tool wordmark on the left. Links to `/book`.

4. **Scroll animations** (`src/lib/animations.ts`)
   - Lenis smooth scroll initialization
   - GSAP ScrollTrigger for fade-in/reveal of portfolio items as they enter viewport
   - Subtle parallax on hero section (optional)
   - Keep animations understated — not flashy, just smooth
   - Mobile: reduce or disable parallax, keep fade-ins

5. **Shop page** (`src/pages/shop.astro`)
   - **Active drops**: Product cards with image, name, price
   - **Upcoming drops**: Show product with countdown timer to drop_date, "Notify me" (optional, or just display)
   - **Empty state**: When no products are active or upcoming, show tongue-in-cheek message (e.g., "Nothing here right now. Check back sometime." or similar — should feel intentional, not broken)
   - Sticky bar: changes to "Bag" functionality when items are added (uses cart.ts localStorage logic)

6. **Product detail page** (`src/pages/shop/[id].astro`)
   - Product image (full width on mobile)
   - Name, price, description
   - Size/variant selector
   - Quantity selector (default 1)
   - "Add to bag" button
   - Shipping info: "Ships within 1 week. $X domestic / $X international."
   - Expandable sections: Details+, Shipping+

7. **Cart & checkout flow** (`src/lib/cart.ts`)
   - Cart stored in localStorage (client-side, no auth needed)
   - Cart drawer/slide-in panel
   - Checkout button → POST `/api/checkout` → redirect to Stripe
   - Success page (`src/pages/success.astro`) with order confirmation

8. **Booking page** (`src/pages/book.astro`)
   - Cal.com embed (full page iframe or inline embed)
   - Minimal framing — let Cal.com do the work
   - Brief headline: "Let's talk about your project"

9. **Intake form page** (`src/pages/inquiry.astro`)
   - Clean form: name, email, company (optional), project type (dropdown or radio), description (textarea), budget range (dropdown), timeline (dropdown)
   - Submit → POST `/api/inquiry`
   - Redirect to `/inquiry/thanks`
   - Thanks page: "Got it. I'll be in touch within 48 hours."

10. **Footer** (`src/components/Footer.astro`)
    - Tool wordmark
    - tool.nyc email
    - Instagram + LinkedIn links
    - "© 2026 Tool"
    - Minimal, matches Hardsun's sparse footer

11. **Mobile optimization**
    - Single column layout on mobile (< 768px)
    - Full-width images
    - Touch-friendly tap targets (44px min)
    - Sticky CTA bar at bottom (native feel)
    - Test on actual devices (iPhone, Android)

12. **404 page** (`src/pages/404.astro`)
    - On-brand, minimal. "Nothing here."

### Success Criteria

- [ ] Homepage scroll experience feels editorial and curated (subjective — review with stakeholder)
- [ ] First impression communicates "cool + technically solid"
- [ ] Clear that Tool does branding AND software development
- [ ] Portfolio grid handles variable sizes gracefully (no broken layouts with mixed small/medium/large)
- [ ] Video items play smoothly inline without janking the scroll
- [ ] Writing snippets feel intentionally placed, not random
- [ ] Sticky "Work with us" CTA is visible without being annoying
- [ ] Shop empty state is charming, not broken-looking
- [ ] Countdown timer works correctly across timezones
- [ ] Mobile experience is excellent (Lighthouse mobile score > 90)
- [ ] Desktop Lighthouse performance score > 90
- [ ] All pages pass WCAG 2.1 AA accessibility basics (contrast, alt text, focus states)
- [ ] OG meta tags generate good social previews

### Tests

```
tests/
  frontend/
    homepage-data.test.ts          — Correct data fetched for mood board
    cart.test.ts                   — Add, remove, count, subtotal, persist across reload
    countdown.test.ts              — Timer shows correct remaining time, handles past dates
    shipping-calc.test.ts          — Correct rate for domestic vs international

  e2e/
    homepage-scroll.spec.ts        — Page loads, scroll works, all sections visible
    shop-checkout.spec.ts          — Browse → add to cart → checkout → Stripe redirect
    booking-page.spec.ts           — Cal.com embed loads
    inquiry-form.spec.ts           — Fill form → submit → see thanks page
    mobile-responsive.spec.ts      — Key pages render correctly at 375px width
```

---

## Workstream 7: Client Portal <a name="ws7"></a>

**Agent type**: Full-stack agent
**Depends on**: WS2, WS3, WS4
**Runs in parallel with**: WS5, WS6

### Tasks

1. **Portal login page** (`src/pages/portal/index.astro`)
   - Clean, minimal page
   - Email input field
   - "Send magic link" button
   - POST to `/api/auth/magic-link`
   - Success state: "Check your email for a login link"
   - Error state: "Something went wrong. Try again."
   - Note: don't reveal whether email exists in the system

2. **Magic link callback** (`src/pages/portal/verify.astro`)
   - Reads token from URL
   - Calls `/api/auth/callback` (or handles inline)
   - Shows brief "Verifying..." state
   - Redirects to `/portal/dashboard` on success
   - Shows error on failure with link back to `/portal`

3. **Client dashboard** (`src/pages/portal/dashboard.astro`)
   - **Welcome header**: "Welcome, {client.name}"
   - **Active projects section**: For each project:
     - Project title
     - Status badge (color-coded): Inquiry → Discovery → Proposal → Active → Review → Complete
     - Status progress indicator (simple stepped bar or dots)
     - Deliverables link (if set): "View deliverables →" opens Dropbox link in new tab
     - Invoice section (if stripe_invoice_url set): Embedded Stripe invoice status or "Pay invoice →" link
   - **Past projects section**: Completed projects with deliverables links still accessible
   - **Empty state**: "No active projects yet." (shouldn't happen if onboarding is correct)
   - Logout button

4. **Dashboard styling**
   - Match the Tool brand aesthetic (CMYK accents, minimal typography)
   - Not the mood board style — more functional/clean, like a well-designed app
   - Mobile-first: dashboard works great on phone
   - Project status badges use accent colors

### Success Criteria

- [ ] Client receives magic link email, clicks it, lands on dashboard
- [ ] Dashboard shows only the logged-in client's projects (not other clients')
- [ ] Project status accurately reflects what admin set
- [ ] Deliverables link opens Dropbox in new tab
- [ ] Stripe invoice link/embed shows correct payment status
- [ ] Past completed projects and their deliverables remain accessible
- [ ] Dashboard is mobile-responsive and usable on phone
- [ ] Logout works and redirects to portal login
- [ ] Invalid/expired magic links show clear error

### Tests

```
tests/
  portal/
    magic-link-flow.test.ts        — Send link, verify, session created
    dashboard-data.test.ts         — Correct projects returned for client
    client-isolation.test.ts       — Client A cannot see Client B's projects

  e2e/
    portal-login-flow.spec.ts      — Email → magic link → dashboard → see projects
    portal-mobile.spec.ts          — Dashboard renders correctly on mobile
```

---

## 8. Testing Strategy <a name="8-testing"></a>

### Test Pyramid

```
        ╱ E2E (Playwright) ╲         — 10-15 tests
       ╱  Full user flows    ╲        — Run on deploy preview
      ╱───────────────────────╲
     ╱ Integration Tests       ╲      — 20-30 tests
    ╱  API routes, DB queries   ╲     — Run on every commit
   ╱─────────────────────────────╲
  ╱ Unit Tests (Vitest)           ╲   — 40-60 tests
 ╱  Pure functions, helpers, cart  ╲  — Run on every commit
╱───────────────────────────────────╲
```

### Unit Tests (Vitest)

- All `src/lib/*.ts` functions
- Cart add/remove/total logic
- Countdown timer calculation
- Shipping rate calculation
- Input validation functions
- Cookie helpers
- URL/path helpers

### Integration Tests (Vitest + Supabase test instance)

- API route handlers (mocked HTTP requests)
- Database query helpers (against test Supabase)
- Stripe webhook processing (mocked Stripe events)
- RLS policy verification
- Auth flow token handling

### E2E Tests (Playwright)

- Homepage loads and scrolls
- Shop: browse → add to cart → checkout redirect
- Inquiry form submission
- Booking page loads Cal.com embed
- Portal: login → dashboard → view project
- Admin: login → create portfolio item → verify on homepage
- Admin: create client → create project → verify in portal
- Mobile viewport tests for key pages

### Performance Testing

- Lighthouse CI on every deploy preview
- Targets: Performance > 90, Accessibility > 90, Best Practices > 90
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

### Test Commands

```bash
pnpm test              # Run all unit + integration tests
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only (requires Supabase)
pnpm test:e2e          # Playwright E2E tests
pnpm test:coverage     # Test coverage report
```

---

## 9. Design Reference <a name="9-design-reference"></a>

### Hardsun.com Patterns to Replicate

| Pattern | How to implement |
|---------|-----------------|
| 1px gap grid | CSS Grid with `gap: 1px; background: #e5e5e5`, children with white bg (`.content-grid`) |
| Full-bleed images | Grid items span full column width, no padding on images |
| Generous whitespace | 60-100px between major sections (`py-16 md:py-24` in Tailwind) |
| Expandable "+" sections | Accordion component with `+`/`−` toggle, max-height CSS transition |
| Sticky bottom bar | `position: fixed; bottom: 0` full-width bar with CTA button |
| Editorial text blocks | Full-width text sections with generous padding (`p-8 md:p-12`) |
| Linear scroll narrative | Single page, no scroll-jacking, sections flow naturally |
| Warm neutral palette | White bg, neutral-900 text, CMYK accents (Tool-specific) |
| Minimal header | Logo + 1-2 links, thin, doesn't compete with content |

### Tool-Specific Design Tokens

| Token | Value | Notes |
|-------|-------|-------|
| `--color-accent-cyan` | #00FFFF | CMYK brand color |
| `--color-accent-magenta` | #FF00FF | CMYK brand color |
| `--color-accent-yellow` | #FFEB00 | CMYK brand color |
| Background | #FFFFFF | Clean white |
| Text | neutral-900 | Near-black |
| Borders/gaps | #e5e5e5 | Light gray |
| Font | System stack | -apple-system, BlinkMacSystemFont... |

### Mood Board Content Layout (Top → Bottom)

```
┌──────────────────────────────────────┐
│           TOOL wordmark              │  ← Hero: full viewport height
│     "Full-service creative           │     Bold statement
│      technical consultancy"          │     Understated confidence
│                                      │
│          ↓ scroll                    │
├──────────────────────────────────────┤
│ ┌─────────┐ ┌───────────────────┐   │  ← Portfolio row 1
│ │  small   │ │                   │   │     Variable sizes
│ │  image   │ │   large image     │   │     1px gaps
│ └─────────┘ │                   │   │
│ ┌─────────┐ │                   │   │
│ │  small   │ └───────────────────┘   │
│ │  video   │                         │
│ └─────────┘                          │
├──────────────────────────────────────┤
│                                      │  ← Writing snippet
│   "Design is how it works."          │     Full-width text block
│                                      │     Larger type, generous padding
├──────────────────────────────────────┤
│ ┌───────────────────┐ ┌─────────┐   │  ← Portfolio row 2
│ │                   │ │  medium │   │     Different arrangement
│ │   medium image    │ │  image  │   │
│ │                   │ │         │   │
│ └───────────────────┘ └─────────┘   │
├──────────────────────────────────────┤
│  SITES                               │  ← Web projects section
│  Project Name → (external link)      │     Simple text list
│  Project Name → (external link)      │     Clean, minimal
│  Project Name → (external link)      │
├──────────────────────────────────────┤
│                                      │  ← Another writing snippet
│   "We build tools that work."        │
│                                      │
├──────────────────────────────────────┤
│  SELECT CLIENTS                      │  ← Client names
│  Client A · Client B · Client C      │     Text only, understated
│  Client D · Client E · Client F      │
├──────────────────────────────────────┤
│  Services+                           │  ← Expandable accordions
│  Process+                            │     Hardsun-style "+"
│  About+                              │
├──────────────────────────────────────┤
│  Footer                              │
│  tool.nyc · IG · LinkedIn · © 2026   │
├──────────────────────────────────────┤
│  ██████████ Work with us ███████████ │  ← Sticky bar (always visible)
└──────────────────────────────────────┘
```

---

## 10. Open Decisions <a name="10-open-decisions"></a>

These should be resolved before or during implementation:

1. **Typography**: Use a system font stack (fast, zero-cost) or choose a specific typeface? Verbs used Adobe Neue Haas Grotesk — Tool could use the same or differentiate. System stack is the default unless a specific font is chosen.

2. **DocuSeal integration timing**: Currently deferred to Phase 3. If needed sooner, it would add ~3 tasks to WS3 (API) and ~2 tasks to WS5 (admin) and WS7 (portal).

3. **Social media auto-post**: Deferred. When ready, this would be a new workstream (API integrations with LinkedIn + Instagram APIs, or Buffer API).

4. **Portfolio grid algorithm**: The variable-size masonry layout needs a concrete algorithm. Options:
   - CSS Grid with `grid-template-areas` (manual but predictable)
   - CSS Masonry (experimental, not widely supported yet)
   - JS-based masonry (Masonry.js or custom)
   - Recommendation: CSS Grid with predefined row patterns that repeat. Admin assigns `small`, `medium`, `large` per item; the grid arranges them in a curated pattern.

5. **Video hosting migration**: Timeline for moving existing Vimeo content to Bunny.net Stream. Can happen in parallel with development.

6. **Analytics**: Not discussed. Recommend Plausible or Fathom (privacy-friendly, no cookie banners needed).

7. **Email templates**: Need branded templates for: magic link invites, order confirmations, inquiry notifications. Can be simple text initially, styled later.

---

## Appendix: File Structure (Target)

```
tool.nyc/
├── src/
│   ├── pages/
│   │   ├── index.astro                    # Homepage mood board
│   │   ├── book.astro                     # Cal.com embed
│   │   ├── shop.astro                     # Merch store
│   │   ├── shop/[id].astro               # Product detail
│   │   ├── inquiry.astro                  # Intake form
│   │   ├── inquiry/thanks.astro           # Form confirmation
│   │   ├── success.astro                  # Post-purchase
│   │   ├── 404.astro                      # Not found
│   │   ├── portal/
│   │   │   ├── index.astro               # Client login
│   │   │   ├── verify.astro              # Magic link callback
│   │   │   └── dashboard.astro           # Client dashboard
│   │   ├── admin/
│   │   │   ├── index.astro               # Admin dashboard
│   │   │   ├── login.astro               # Admin login
│   │   │   ├── portfolio/
│   │   │   │   ├── index.astro
│   │   │   │   ├── new.astro
│   │   │   │   └── [id].astro
│   │   │   ├── writing/
│   │   │   │   └── index.astro
│   │   │   ├── clients/
│   │   │   │   ├── index.astro
│   │   │   │   ├── new.astro
│   │   │   │   └── [id].astro
│   │   │   ├── projects/
│   │   │   │   └── [id].astro
│   │   │   ├── inquiries/
│   │   │   │   └── index.astro
│   │   │   ├── shop/
│   │   │   │   ├── index.astro
│   │   │   │   ├── new.astro
│   │   │   │   └── [id].astro
│   │   │   ├── orders/
│   │   │   │   ├── index.astro
│   │   │   │   └── [id].astro
│   │   │   └── site/
│   │   │       └── index.astro
│   │   └── api/
│   │       ├── upload.ts
│   │       ├── checkout.ts
│   │       ├── stripe-webhook.ts
│   │       ├── inquiry.ts
│   │       └── auth/
│   │           ├── magic-link.ts
│   │           ├── callback.ts
│   │           ├── admin-login.ts
│   │           └── logout.ts
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Moodboard.astro
│   │   ├── PortfolioGrid.astro
│   │   ├── PortfolioItem.astro
│   │   ├── WritingSnippet.astro
│   │   ├── ClientList.astro
│   │   ├── Accordion.astro
│   │   ├── StickyBar.astro
│   │   ├── VideoPlayer.astro
│   │   ├── CountdownTimer.astro
│   │   ├── CartDrawer.astro
│   │   ├── ProductCard.astro
│   │   ├── StatusBadge.astro
│   │   └── admin/
│   │       ├── FileUpload.astro
│   │       └── InlineEditor.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── PublicLayout.astro
│   │   └── Admin.astro
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── stripe.ts
│   │   ├── r2.ts
│   │   ├── resend.ts
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   ├── types.ts
│   │   ├── cookies.ts
│   │   ├── validation.ts
│   │   ├── cart.ts
│   │   ├── animations.ts
│   │   └── utils.ts
│   ├── styles/
│   │   └── global.css
│   ├── middleware.ts
│   └── env.d.ts
├── supabase/
│   ├── schema.sql
│   ├── migrations/
│   │   └── 00001_init.sql
│   └── seed.sql
├── tests/
│   ├── infrastructure/
│   ├── database/
│   ├── api/
│   ├── middleware/
│   ├── admin/
│   ├── frontend/
│   ├── portal/
│   └── e2e/
├── public/
│   └── (static assets)
├── astro.config.mjs
├── wrangler.toml
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── .gitignore
├── CLAUDE.md
└── PLAN.md (this file)
```
