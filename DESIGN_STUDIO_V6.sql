-- ============================================================================
-- Design Studio v6 — side-by-side option comparison
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
-- option_group tags finishes that are candidates for the same decision
-- (e.g. "Primary bath floor"), so they can be compared and one picked.
-- ============================================================================
alter table public.design_items add column if not exists option_group text;
