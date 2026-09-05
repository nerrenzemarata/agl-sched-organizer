-- AGL Sched Organizer — Supabase schema
-- Run this once in the Supabase SQL editor for your project.
--
-- Each organizer board is a single row keyed by its URL slug. The whole
-- board (members, events, visibility) is kept as one jsonb blob, mirroring
-- the shape that used to live in localStorage — no separate members/events
-- tables needed.
--
-- Access model: shareable link, no login. Anyone holding the anon key (which
-- is public in client-side JS by design) can read/write any row if they know
-- its id. There is no directory endpoint in the app, so boards are unlisted
-- but not private — do not put anything truly sensitive in one.

create table if not exists organizers (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  state jsonb not null default '{"members":[],"events":{},"visible":{}}'::jsonb
);

alter table organizers enable row level security;

create policy "organizers are publicly readable"
  on organizers for select
  using (true);

create policy "organizers are publicly insertable"
  on organizers for insert
  with check (true);

create policy "organizers are publicly updatable"
  on organizers for update
  using (true);

create policy "organizers are publicly deletable"
  on organizers for delete
  using (true);
