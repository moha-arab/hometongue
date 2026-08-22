-- First-party telemetry. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- One row per event. Nothing in here identifies a person: no IP, no cookie, no account.
--   visitor  = sha256(ip + user agent + UTC day + server secret), 16 hex chars. Same person,
--              same day, same device -> same value; tomorrow it is a different value, and the
--              IP itself is never written. Enough to count people, useless to find one.
--   session  = a random id that lives in one browser tab for one visit (sessionStorage).
--   country  = Vercel's edge-derived ISO code from the request, not geolocated by us.
create table if not exists events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  event text not null,          -- allowlisted name, see api/track.js
  page text,                    -- home | game | privacy
  session text,
  visitor text,
  platform text,                -- ios | android | desktop
  country text,                 -- ISO 3166-1 alpha-2
  ref text,                     -- referrer HOSTNAME only, never the full URL
  props jsonb                   -- small, allowlisted per event
);
create index if not exists events_ts_idx on events (ts);
create index if not exists events_event_ts_idx on events (event, ts);

-- Service role only, like every other table here.
alter table events enable row level security;
