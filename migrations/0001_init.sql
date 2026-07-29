-- Migration 0001: initial schema
-- Run this in the Supabase SQL editor (or psql) once, on a fresh project.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

create table boards (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null default 'My Rental Search',
  created_at timestamptz not null default now()
);

create table stages (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null,
  color text not null default '#94a3b8',
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table prospects (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  stage_id uuid not null references stages(id) on delete restrict,
  address text not null,
  property_name text,
  notes text,
  sort_order integer not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_stages_board on stages(board_id);
create index idx_prospects_board on prospects(board_id);
create index idx_prospects_stage on prospects(stage_id);

-- --- Row Level Security ---
-- Enabled with NO policies attached, on purpose. This is a default-deny
-- posture: the `anon` and `authenticated` Postgres roles get zero access to
-- these tables, full stop. All real access goes through the Next.js API
-- routes using the SUPABASE_SERVICE_ROLE_KEY (server-only, bypasses RLS).
-- The board-code check that gates access lives in application code
-- (lib/db.js -> getBoardByCode), not in SQL, because a Postgres role can't
-- evaluate "does this caller know board PK7F2X" -- see README.md's
-- "Security model" section for the full reasoning.
alter table boards enable row level security;
alter table stages enable row level security;
alter table prospects enable row level security;

-- Seed: one board + the default stages described in DESIGN.md
-- Codes are 6-character human-typeable strings (see lib/generateCode.js
-- for the generator used when creating boards from the app). This seed
-- uses a fixed code so local dev has a predictable URL to hit.
insert into boards (code, name) values ('DEM042', 'Demo Rental Search');

insert into stages (board_id, name, color, sort_order)
select id, s.name, s.color, s.sort_order
from boards, (values
  ('Contacted', '#94a3b8', 1000),
  ('Heard back', '#60a5fa', 2000),
  ('Tour scheduled', '#fbbf24', 3000),
  ('Toured', '#a78bfa', 4000),
  ('Applying', '#34d399', 5000)
) as s(name, color, sort_order)
where boards.code = 'DEM042';
