-- HomeTongue flywheel schema. Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  -- what the app guessed
  guess_code text,          -- country code or 'msa'/'weak'
  guess_city text,
  region text,
  confidence int,
  -- what the user said
  correct boolean,
  actual_code text,
  actual_city text,
  -- context
  transcript text,
  source text,              -- 'cloud' | 'offline'
  platform text,            -- 'ios' | 'android' | 'desktop'
  -- flywheel
  consent boolean not null default false,
  clip_path text,           -- storage path when a consented clip was saved
  mime text
);

-- Lock the table down: no anon/authenticated access. Only the service role key
-- (server-side) can read/write, because RLS is on with no policies.
alter table feedback enable row level security;

-- Storage: create a PRIVATE bucket named "clips" in Storage -> New bucket.
-- (Private = default. No public URL access; service role only.)

-- ===== P1: Pin It game (run this block if you already ran the part above) =====

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  nickname text not null,
  game_type text not null,
  points int not null,
  rounds jsonb
);

alter table scores enable row level security;

-- ===== P2: clip reports (run this block if you already ran the parts above) =====
-- Players flagging a bad clip after the reveal: the reason enum maps to a curation action
-- (audio quality pass, label re-check, playback-window move, media fix).

create table if not exists clip_reports (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  clip_id text not null,
  deck text,
  label text,
  reason text,              -- 'audio' | 'label' | 'leak' | 'broken' | null when note-only
  note text,
  km int                    -- how far the player's own guess was, for context
);

alter table clip_reports enable row level security;

-- ===== P3: the wallet guard (run this block if you already ran the parts above) =====
-- One row per completed analysis, so every serverless instance shares a single daily
-- count. Without it, each instance keeps its own tally and the real ceiling is the cap
-- multiplied by however many instances Vercel happens to be running.
--
-- There are no accounts on this app, so a per-IP limit is a speed bump that a proxy pool
-- walks past. This is the limit that actually protects the balance: past DAILY_ANALYSES
-- (env var, default 20000) the app stops answering and says so, until the UTC day rolls
-- over. If this table does not exist, the check fails open and nothing breaks.
--
-- Housekeeping: nothing reads rows older than today, so they can be deleted freely, e.g.
--   delete from usage where ts < now() - interval '3 days';

create table if not exists usage (
  id bigserial primary key,
  ts timestamptz not null default now()
);

create index if not exists usage_ts_idx on usage (ts);

alter table usage enable row level security;
