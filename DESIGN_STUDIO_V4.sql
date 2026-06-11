-- ============================================================================
-- Design Studio v4 — group rooms into Areas (e.g. Master Suite → Bedroom/Bath/Closet)
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
-- ============================================================================
alter table public.design_rooms add column if not exists area text;
