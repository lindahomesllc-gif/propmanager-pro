-- ============================================================================
-- Design Studio v11 — floor plans + share-budget toggle
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
-- ============================================================================
alter table public.design_projects add column if not exists floorplan_urls jsonb not null default '[]'::jsonb;
alter table public.design_projects add column if not exists share_budget boolean not null default false;
