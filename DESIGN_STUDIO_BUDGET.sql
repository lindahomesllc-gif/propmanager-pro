-- ============================================================================
-- Design Studio — Budget & ROI add-on (run AFTER DESIGN_STUDIO_SETUP.sql)
-- Run once in the Supabase SQL editor. Additive only — safe to re-run.
--
-- Adds the "investor-landlord renovation + ROI" layer that no design app has:
--   • link a design project to a property (cost basis lives there)
--   • a renovation budget target + projected after-repair value + rent uplift
--   • per-finish quantity + actual cost (so estimate vs actual works)
-- ============================================================================

-- Link to a property + project-level budget / return inputs
alter table public.design_projects add column if not exists property_id uuid references public.properties(id) on delete set null;
alter table public.design_projects add column if not exists budget_total numeric;   -- renovation budget cap
alter table public.design_projects add column if not exists arv numeric;            -- projected after-repair value
alter table public.design_projects add column if not exists rent_uplift numeric;    -- projected added rent ($/mo)

create index if not exists design_projects_property_idx on public.design_projects (property_id);

-- Per-finish quantity + actual cost (price stays the per-unit estimate)
alter table public.design_items add column if not exists qty numeric;               -- quantity (default treated as 1)
alter table public.design_items add column if not exists actual_cost numeric;       -- actual total paid for this line
