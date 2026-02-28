-- Rate limiting table to replace in-memory Maps that reset on cold starts
-- Each row represents one request; we count recent rows to enforce limits.

create table if not exists rate_limits (
  id bigint generated always as identity primary key,
  ip_address text not null,
  endpoint text not null,
  created_at timestamptz not null default now()
);

-- Index for the hot query: count recent requests by ip + endpoint
create index idx_rate_limits_lookup
  on rate_limits (ip_address, endpoint, created_at desc);

-- Auto-cleanup: delete rows older than 2 hours to keep the table small.
-- Runs as a cron via pg_cron if available; otherwise manual cleanup is fine.
-- We'll rely on the query filtering by time window regardless.

-- RLS: this table is only accessed via the service_role key (supabaseAdmin),
-- so we disable RLS to avoid any issues.
alter table rate_limits enable row level security;

-- Allow service_role full access
create policy "Service role full access on rate_limits"
  on rate_limits
  for all
  to service_role
  using (true)
  with check (true);
