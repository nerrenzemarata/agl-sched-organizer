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

-- Staff Itinerary — Google-Calendar-style boards, same "create your own,
-- share by link" model as the schedule organizers above. Each itinerary is
-- its own board (its own URL slug); events belong to exactly one itinerary.
create table if not exists staff_itineraries (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  color text
);

-- Safe to re-run: adds the column for projects created before it existed.
alter table staff_itineraries add column if not exists color text;

alter table staff_itineraries enable row level security;

create policy "staff itineraries are publicly readable"
  on staff_itineraries for select
  using (true);

create policy "staff itineraries are publicly insertable"
  on staff_itineraries for insert
  with check (true);

create policy "staff itineraries are publicly updatable"
  on staff_itineraries for update
  using (true);

create policy "staff itineraries are publicly deletable"
  on staff_itineraries for delete
  using (true);

create table if not exists staff_events (
  id uuid primary key default gen_random_uuid(),
  itinerary_id text not null references staff_itineraries(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  all_day boolean not null default false,
  start_time text,
  end_time text,
  location text,
  description text,
  color text not null default '#6366F1',
  created_at timestamptz not null default now()
);

create index if not exists staff_events_itinerary_id_idx on staff_events (itinerary_id);

alter table staff_events enable row level security;

create policy "staff events are publicly readable"
  on staff_events for select
  using (true);

create policy "staff events are publicly insertable"
  on staff_events for insert
  with check (true);

create policy "staff events are publicly updatable"
  on staff_events for update
  using (true);

create policy "staff events are publicly deletable"
  on staff_events for delete
  using (true);
