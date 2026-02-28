-- Error logs table
create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('critical', 'error', 'warn')),
  message text not null,
  context jsonb default '{}',
  stack text,
  path text,
  created_at timestamptz not null default now()
);

create index idx_error_logs_created_at on error_logs (created_at desc);
create index idx_error_logs_level on error_logs (level);

alter table error_logs enable row level security;
-- No policies = service role only

-- Analytics events table
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('page_view', 'api_call')),
  path text not null,
  method text default 'GET',
  status_code int,
  duration_ms int,
  country text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_analytics_events_created_at on analytics_events (created_at desc);
create index idx_analytics_events_type on analytics_events (event_type);
create index idx_analytics_events_path on analytics_events (path);

alter table analytics_events enable row level security;
-- No policies = service role only

-- RPC: daily analytics summary for past N days
create or replace function analytics_daily_summary(days_back int default 7)
returns table (
  day date,
  page_views bigint,
  api_calls bigint,
  avg_duration_ms numeric,
  error_count bigint
) language sql stable as $$
  select
    (e.created_at at time zone 'UTC')::date as day,
    count(*) filter (where e.event_type = 'page_view') as page_views,
    count(*) filter (where e.event_type = 'api_call') as api_calls,
    round(avg(e.duration_ms)::numeric, 0) as avg_duration_ms,
    count(*) filter (where e.status_code >= 500) as error_count
  from analytics_events e
  where e.created_at >= now() - (days_back || ' days')::interval
  group by day
  order by day desc;
$$;

-- RPC: top pages by view count for past N days
create or replace function analytics_top_pages(days_back int default 7, page_limit int default 20)
returns table (
  path text,
  views bigint,
  avg_duration_ms numeric
) language sql stable as $$
  select
    e.path,
    count(*) as views,
    round(avg(e.duration_ms)::numeric, 0) as avg_duration_ms
  from analytics_events e
  where e.event_type = 'page_view'
    and e.created_at >= now() - (days_back || ' days')::interval
  group by e.path
  order by views desc
  limit page_limit;
$$;
