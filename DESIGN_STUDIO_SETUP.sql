-- ============================================================================
-- Design Studio — schema + RLS
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.
--
-- Tables (all owner-scoped by user_id = auth.uid()):
--   design_projects   one per client / home you're designing
--   design_rooms      rooms within a project
--   design_items      finishes, inspiration images, and color swatches
--   design_activity   decisions & change log (auto + manual)
--   design_approvals  client feedback captured from the public /share link
--
-- The public client board is served by server API routes using the service-role
-- key (which bypasses RLS), so RLS below only ever needs to allow the OWNER.
-- ============================================================================

-- ---------- design_projects -------------------------------------------------
create table if not exists public.design_projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  name          text not null,
  client_name   text,
  client_email  text,
  address       text,
  style_summary text,                       -- the overall "feel" of the home
  cover_image_url text,
  status        text not null default 'active',   -- active | archived
  share_token   uuid not null default gen_random_uuid(),
  share_enabled boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists design_projects_share_token_idx on public.design_projects (share_token);
create index if not exists design_projects_user_idx on public.design_projects (user_id);

-- ---------- design_rooms ----------------------------------------------------
create table if not exists public.design_rooms (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  project_id uuid not null references public.design_projects(id) on delete cascade,
  name       text not null,
  feel       text,                          -- the vibe / notes for this room
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists design_rooms_project_idx on public.design_rooms (project_id);

-- ---------- design_items ----------------------------------------------------
-- kind: 'finish' (tile/paint/fixture…), 'inspiration' (a reference photo),
--       or 'color' (a palette swatch, stored in color_hex).
create table if not exists public.design_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  project_id  uuid not null references public.design_projects(id) on delete cascade,
  room_id     uuid references public.design_rooms(id) on delete set null,
  kind        text not null default 'finish',
  category    text,                         -- Tile, Paint, Flooring, Lighting…
  name        text,
  brand       text,
  color_hex   text,
  material    text,
  dimensions  text,
  price       numeric,
  supplier    text,
  supplier_url text,
  image_url   text,
  status      text not null default 'idea', -- idea|proposed|approved|rejected|ordered|installed
  notes       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists design_items_project_idx on public.design_items (project_id);
create index if not exists design_items_room_idx on public.design_items (room_id);

-- ---------- design_activity (decisions & change log) ------------------------
create table if not exists public.design_activity (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  project_id uuid not null references public.design_projects(id) on delete cascade,
  item_id    uuid references public.design_items(id) on delete set null,
  kind       text not null default 'note',  -- decision | change | note | status | approval
  text       text not null,
  author     text,                          -- 'you' or a client's name
  created_at timestamptz not null default now()
);
create index if not exists design_activity_project_idx on public.design_activity (project_id, created_at desc);

-- ---------- design_approvals (client feedback from /share) ------------------
create table if not exists public.design_approvals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,               -- denormalized owner (set by the API)
  project_id  uuid not null references public.design_projects(id) on delete cascade,
  item_id     uuid references public.design_items(id) on delete cascade,
  decision    text not null,               -- approved | rejected | comment
  comment     text,
  client_name text,
  created_at  timestamptz not null default now()
);
create index if not exists design_approvals_project_idx on public.design_approvals (project_id, created_at desc);
create index if not exists design_approvals_item_idx on public.design_approvals (item_id);

-- ============================================================================
-- Row Level Security — owner-only. (The public client board uses the
-- service-role key on the server, which bypasses RLS entirely.)
-- ============================================================================
alter table public.design_projects  enable row level security;
alter table public.design_rooms     enable row level security;
alter table public.design_items     enable row level security;
alter table public.design_activity  enable row level security;
alter table public.design_approvals enable row level security;

do $$
begin
  -- one "owner can do everything they own" policy per table
  if not exists (select 1 from pg_policies where tablename='design_projects' and policyname='design_projects_owner') then
    create policy design_projects_owner on public.design_projects
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='design_rooms' and policyname='design_rooms_owner') then
    create policy design_rooms_owner on public.design_rooms
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='design_items' and policyname='design_items_owner') then
    create policy design_items_owner on public.design_items
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='design_activity' and policyname='design_activity_owner') then
    create policy design_activity_owner on public.design_activity
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  -- approvals: owner can read/delete their own; inserts happen via service role
  if not exists (select 1 from pg_policies where tablename='design_approvals' and policyname='design_approvals_owner') then
    create policy design_approvals_owner on public.design_approvals
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
