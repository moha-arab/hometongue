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
