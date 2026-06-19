-- ============================================================================
-- Design Studio v12 — vendor directory (account-level, reused across projects)
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
-- ============================================================================
create table if not exists public.design_vendors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  name       text not null,
  category   text,            -- Tile, Lighting, Plumbing, Cabinetry, Trade…
  contact    text,            -- contact person
  email      text,
  phone      text,
  website    text,
  account_no text,            -- your account / trade number
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists design_vendors_user_idx on public.design_vendors (user_id, name);
alter table public.design_vendors enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='design_vendors' and policyname='design_vendors_owner') then
    create policy design_vendors_owner on public.design_vendors
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
