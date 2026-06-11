-- ============================================================================
-- Design Studio v5 — attach spec / installation / warranty documents to a finish
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
-- docs is an array of { "name": "...", "url": "..." }.
-- ============================================================================
alter table public.design_items add column if not exists docs jsonb not null default '[]'::jsonb;
