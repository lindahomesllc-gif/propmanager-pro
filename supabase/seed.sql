-- ================================================================
-- PropManager Pro — Sample Data for Testing
-- Run AFTER schema.sql, and AFTER creating your first account
-- Replace 'YOUR_USER_ID_HERE' with your actual user UUID from:
-- Supabase → Authentication → Users → copy your user's UUID
-- ================================================================

-- Step 1: Set your user ID here
DO $$ 
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE';  -- ← REPLACE THIS
  v_prop1 UUID;
  v_prop2 UUID;
  v_prop3 UUID;
  v_tenant1 UUID;
  v_tenant2 UUID;
  v_lease1 UUID;
  v_lease2 UUID;
BEGIN

-- ── PROPERTIES ──────────────────────────────────────────────────

INSERT INTO public.properties (
  id, user_id, address, city, state, zip, type,
  beds, baths, sqft, purchase_price, purchase_date,
  market_value, owner_entity, occupancy
) VALUES
  (gen_random_uuid(), v_user_id, '1842 Magnolia Blvd', 'Orlando', 'FL', '32803',
   'single_family', 3, 2.0, 1420, 285000, '2019-06-01',
   320000, 'Self', 'occupied'),
  (gen_random_uuid(), v_user_id, '374 Citrus Ave #2B', 'Orlando', 'FL', '32801',
   'condo', 2, 2.0, 980, 175000, '2021-03-01',
   198000, 'Self', 'occupied'),
  (gen_random_uuid(), v_user_id, '2201 Pine Street', 'Sanford', 'FL', '32771',
   'duplex', 2, 1.0, 1100, 210000, '2022-09-01',
   240000, 'LLC - PropCo', 'vacant')
RETURNING id INTO v_prop1;

-- Get all property IDs
SELECT id INTO v_prop1 FROM public.properties 
  WHERE user_id = v_user_id AND address = '1842 Magnolia Blvd';
SELECT id INTO v_prop2 FROM public.properties 
  WHERE user_id = v_user_id AND address = '374 Citrus Ave #2B';
SELECT id INTO v_prop3 FROM public.properties 
  WHERE user_id = v_user_id AND address = '2201 Pine Street';

-- ── MORTGAGES ────────────────────────────────────────────────────

INSERT INTO public.mortgages (property_id, lender, original_amount, current_balance,
  interest_rate, term_years, monthly_payment, start_date, due_day) VALUES
  (v_prop1, 'Wells Fargo', 228000, 198000, 4.25, 30, 1420.18, '2019-06-01', 1),
  (v_prop2, 'Chase Bank',  140000, 120000, 3.875, 30, 658.37,  '2021-03-01', 1),
  (v_prop3, 'Bank of America', 168000, 155000, 5.1, 30, 914.89, '2022-09-01', 1);

-- ── TENANTS ──────────────────────────────────────────────────────

INSERT INTO public.tenants (id, property_id, user_id, full_name, email, phone,
  move_in_date, status) VALUES
  (gen_random_uuid(), v_prop1, v_user_id, 'Marcus & Diane Webb',
   'mwebb@email.com', '407-555-0142', '2023-03-01', 'active'),
  (gen_random_uuid(), v_prop2, v_user_id, 'Sofia Reyes',
   'sreyes@email.com', '407-555-0288', '2024-01-15', 'active');

SELECT id INTO v_tenant1 FROM public.tenants WHERE user_id = v_user_id AND email = 'mwebb@email.com';
SELECT id INTO v_tenant2 FROM public.tenants WHERE user_id = v_user_id AND email = 'sreyes@email.com';

-- ── LEASES ───────────────────────────────────────────────────────

INSERT INTO public.leases (id, property_id, tenant_id, user_id, rent_amount,
  deposit_amount, due_day, late_fee_amount, late_fee_grace_days,
  start_date, end_date, status) VALUES
  (gen_random_uuid(), v_prop1, v_tenant1, v_user_id, 1850, 1850, 1, 50, 5,
   '2023-03-01', '2025-08-31', 'active'),
  (gen_random_uuid(), v_prop2, v_tenant2, v_user_id, 1350, 1350, 1, 50, 5,
   '2024-01-15', '2025-12-31', 'active');

SELECT id INTO v_lease1 FROM public.leases WHERE user_id = v_user_id AND tenant_id = v_tenant1;
SELECT id INTO v_lease2 FROM public.leases WHERE user_id = v_user_id AND tenant_id = v_tenant2;

-- ── PAYMENTS (3 months history + current due) ─────────────────────

INSERT INTO public.payments (lease_id, tenant_id, property_id, user_id,
  amount, total_amount, due_date, paid_date, method, status) VALUES
  -- Webb payments
  (v_lease1, v_tenant1, v_prop1, v_user_id, 1850, 1850, '2025-03-01', '2025-03-01', 'ach', 'paid'),
  (v_lease1, v_tenant1, v_prop1, v_user_id, 1850, 1850, '2025-04-01', '2025-04-01', 'ach', 'paid'),
  (v_lease1, v_tenant1, v_prop1, v_user_id, 1850, 1850, '2025-05-01', NULL, NULL, 'due'),
  -- Reyes payments
  (v_lease2, v_tenant2, v_prop2, v_user_id, 1350, 1350, '2025-03-01', '2025-03-02', 'card', 'paid'),
  (v_lease2, v_tenant2, v_prop2, v_user_id, 1350, 1350, '2025-04-01', '2025-04-01', 'ach', 'paid'),
  (v_lease2, v_tenant2, v_prop2, v_user_id, 1350, 1350, '2025-05-01', NULL, NULL, 'due');

-- ── EXPENSES ─────────────────────────────────────────────────────

INSERT INTO public.expenses (property_id, user_id, amount, date, category, description) VALUES
  (v_prop1, v_user_id, 1420.18, '2025-04-01', 'mortgage', 'April mortgage payment'),
  (v_prop2, v_user_id, 658.37, '2025-04-01', 'mortgage', 'April mortgage payment'),
  (v_prop3, v_user_id, 914.89, '2025-04-01', 'mortgage', 'April mortgage payment'),
  (v_prop1, v_user_id, 320.00, '2025-03-15', 'maintenance', 'HVAC filter replacement and tune-up'),
  (v_prop2, v_user_id, 650.00, '2025-03-10', 'maintenance', 'Roof repair — patch and seal'),
  (v_prop1, v_user_id, 3800.00, '2025-11-01', 'tax', 'Annual property tax 2025'),
  (v_prop1, v_user_id, 1200.00, '2025-09-15', 'insurance', 'Annual insurance premium — State Farm');

-- ── VENDORS ──────────────────────────────────────────────────────

INSERT INTO public.vendors (user_id, name, company, trade, phone, email, insured, rating) VALUES
  (v_user_id, 'Carlos Rodriguez', 'Rodriguez Plumbing LLC', 'plumber', '407-555-0201', 'carlos@rodplumb.com', TRUE, 5),
  (v_user_id, 'Mike Hanson', NULL, 'handyman', '321-555-0334', 'mikehanson@email.com', FALSE, 4),
  (v_user_id, 'CoolAir Services', 'CoolAir HVAC', 'hvac', '407-555-0455', 'info@coolair.com', TRUE, 5);

RAISE NOTICE 'Sample data inserted successfully!';
END $$;
