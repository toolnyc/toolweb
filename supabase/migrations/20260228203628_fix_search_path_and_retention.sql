-- Fix mutable search_path on RPC functions (security advisory)
create or replace function analytics_daily_summary(days_back int default 7)
returns table (
  day date,
  page_views bigint,
  api_calls bigint,
  avg_duration_ms numeric,
  error_count bigint
) language sql stable
set search_path = public
as $$
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

create or replace function analytics_top_pages(days_back int default 7, page_limit int default 20)
returns table (
  path text,
  views bigint,
  avg_duration_ms numeric
) language sql stable
set search_path = public
as $$
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

create or replace function update_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Data retention: purge logs older than 90 days, analytics older than 180 days
-- Runs daily at 03:00 UTC
select cron.schedule(
  'purge-old-error-logs',
  '0 3 * * *',
  $$delete from public.error_logs where created_at < now() - interval '90 days'$$
);

select cron.schedule(
  'purge-old-analytics',
  '0 3 * * *',
  $$delete from public.analytics_events where created_at < now() - interval '180 days'$$
);
