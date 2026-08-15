-- HomeTongue: the short-lived, sealed answer store.
--
-- WHAT IS IN HERE: nothing readable. `ct` is the analysis result encrypted with AES-256-GCM under
-- a key generated in the visitor's browser and never sent to this database. The server can only
-- open a row when the same browser hands the key back. A dump of this table is noise.
--
-- WHY IT EXISTS: the analysis takes 12-29 seconds and people put their phone down. iOS suspends
-- the tab, the connection dies, and the answer had nowhere to go — so they used to pay for a
-- second one. Now it waits here for up to thirty minutes and gets collected in a few hundred
-- bytes.
--
-- Rows delete themselves on collection. The sweep below is for the ones nobody comes back for.

create table if not exists takes (
  take_id text primary key,
  iv      text not null,
  ct      text not null,
  tag     text not null,
  ts      timestamptz not null default now()
);

-- RLS ON. The server reaches this with the service key, which bypasses RLS, so this costs nothing
-- and shuts the door on anon or authenticated keys. No policies are added on purpose: nobody but
-- the service role has any business here.
alter table takes enable row level security;

create index if not exists takes_ts_idx on takes (ts);

-- Anything older than the collection window is unreachable by design — the server refuses to look
-- at it — so this is housekeeping, not privacy. Run it whenever; it is safe and idempotent.
delete from takes where ts < now() - interval '30 minutes';
