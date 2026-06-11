-- ============================================================================
-- Design Studio v8 — free-arrange moodboard canvas (saved image positions)
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
-- ============================================================================
alter table public.design_items add column if not exists pos_x numeric;
alter table public.design_items add column if not exists pos_y numeric;
