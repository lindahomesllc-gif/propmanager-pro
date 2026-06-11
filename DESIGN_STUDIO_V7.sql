-- ============================================================================
-- Design Studio v7 — order / delivery (lead-time) tracking on finishes
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
-- ============================================================================
alter table public.design_items add column if not exists ordered_date date;
alter table public.design_items add column if not exists eta_date date;        -- expected delivery
alter table public.design_items add column if not exists delivered_date date;
