-- HomeTongue retention, run once in the Supabase SQL editor (Dashboard → SQL → paste → Run).
-- Two slow leaks, one daily sweep:
--
--   events  telemetry rows arrive with every visitor and nothing ever deleted them. At wave
--           traffic (~10-15 rows per visitor) the free-tier database fills in a couple of
--           months, and the stats dashboard reads at most 40,000 rows per view anyway, so rows
--           older than 45 days serve no dashboard and cost real space. 45 days keeps six weeks
--           of trend visible; export before then if a longer record ever matters.
--
--   takes   the sealed, encrypted pending-answer rows. Collected ones delete themselves; a row
--           whose owner closed the tab and never came back sits forever. The design contract
--           (privacy page) is thirty minutes, so sweeping at one hour is already generous.
--
-- pg_cron ships with Supabase. Recent pg_cron upserts by job name, so re-running this would
-- work either way; the drop-first is belt-and-braces so the script is idempotent everywhere.

create extension if not exists pg_cron;

do $$ begin perform cron.unschedule('ht-retention'); exception when others then null; end $$;

select cron.schedule(
  'ht-retention',
  '30 4 * * *',   -- daily, 04:30 UTC, a quiet hour for this site
  $job$
    delete from events where ts < now() - interval '45 days';
    delete from takes  where ts < now() - interval '1 hour';
  $job$
);

-- Sanity: this lists the job you just made.
select jobname, schedule, active from cron.job where jobname = 'ht-retention';
