-- Data retention policy for logging tables
-- error_logs: 90 days retention
-- analytics_events: 180 days retention

-- Enable pg_cron extension for scheduled jobs
create extension if not exists pg_cron with schema pg_catalog;

-- Grant usage so cron jobs can execute in the public schema
grant usage on schema public to postgres;

-- Cleanup function: deletes old rows in batches to avoid long locks
create or replace function cleanup_old_logs()
returns void
language plpgsql
security definer
as $$
declare
  error_rows_deleted bigint;
  analytics_rows_deleted bigint;
begin
  -- Delete error_logs older than 90 days (batch of 10k to limit lock time)
  with deleted as (
    delete from error_logs
    where id in (
      select id from error_logs
      where created_at < now() - interval '90 days'
      limit 10000
    )
    returning 1
  )
  select count(*) into error_rows_deleted from deleted;

  -- Delete analytics_events older than 180 days (batch of 10k)
  with deleted as (
    delete from analytics_events
    where id in (
      select id from analytics_events
      where created_at < now() - interval '180 days'
      limit 10000
    )
    returning 1
  )
  select count(*) into analytics_rows_deleted from deleted;

  -- Log the cleanup results if anything was deleted
  if error_rows_deleted > 0 or analytics_rows_deleted > 0 then
    raise log 'cleanup_old_logs: deleted % error_logs rows, % analytics_events rows',
      error_rows_deleted, analytics_rows_deleted;
  end if;
end;
$$;

-- Schedule daily cleanup at 3:00 AM UTC
select cron.schedule(
  'cleanup-old-logs',
  '0 3 * * *',
  'select cleanup_old_logs()'
);
