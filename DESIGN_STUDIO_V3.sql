-- ============================================================================
-- Design Studio v3 — multiple photos per finish + square footage
-- Run once in the Supabase SQL editor (after the earlier Design Studio SQL).
-- Additive only — safe to re-run.
-- ============================================================================

-- multiple photos per finish (image_url stays the cover; image_urls is the gallery)
alter table public.design_items add column if not exists image_urls jsonb not null default '[]'::jsonb;

-- square footage: how much the finish needs (tile/flooring), and the room's area
alter table public.design_items add column if not exists sqft numeric;
alter table public.design_rooms add column if not exists sqft numeric;
