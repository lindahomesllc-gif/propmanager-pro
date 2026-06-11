-- ============================================================================
-- Design Studio v9 — resize on the Vision Board + a separate whole-home board
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
--   pos_w            : card width (resize), shared by both boards
--   wpos_x / wpos_y  : position on the WHOLE-HOME board (separate from per-room pos_x/pos_y)
-- ============================================================================
alter table public.design_items add column if not exists pos_w numeric;
alter table public.design_items add column if not exists wpos_x numeric;
alter table public.design_items add column if not exists wpos_y numeric;
