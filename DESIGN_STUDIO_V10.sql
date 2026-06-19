-- ============================================================================
-- Design Studio v10 — Client Brief + Design Concept + To-Do / open items
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
-- ============================================================================

-- Client brief (intake) + design concept, stored as flexible JSON on the project
alter table public.design_projects add column if not exists brief jsonb not null default '{}'::jsonb;
alter table public.design_projects add column if not exists concept jsonb not null default '{}'::jsonb;

-- To-do list / questions for the client
create table if not exists public.design_tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  project_id uuid not null references public.design_projects(id) on delete cascade,
  text       text not null,
  kind       text not null default 'task',   -- task | question
  due_date   date,
  done       boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists design_tasks_project_idx on public.design_tasks (project_id, created_at);
alter table public.design_tasks enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='design_tasks' and policyname='design_tasks_owner') then
    create policy design_tasks_owner on public.design_tasks
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
