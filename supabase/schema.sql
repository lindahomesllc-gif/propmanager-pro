-- ================================================================
-- PropManager Pro — Complete Database Schema
-- Run this entire file in: Supabase → SQL Editor → New Query
-- ================================================================

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLE 1: USERS (extends Supabase auth.users)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  full_name           TEXT,
  phone               TEXT,
  company_name        TEXT,
  plan                TEXT NOT NULL DEFAULT 'starter',   -- 'starter' | 'pro' | 'portfolio'
  plan_expires_at     TIMESTAMPTZ,
  stripe_customer_id  TEXT UNIQUE,
  stripe_account_id   TEXT UNIQUE,                       -- Stripe Connect account for receiving payments
  properties_count    INTEGER DEFAULT 0,
  onboarding_done     BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 2: PROPERTIES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.properties (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  state            TEXT NOT NULL DEFAULT 'FL',
  zip              TEXT,
  type             TEXT,   -- 'single_family' | 'condo' | 'duplex' | 'multi_family'
  beds             INTEGER,
  baths            NUMERIC(3,1),
  sqft             INTEGER,
  year_built       INTEGER,
  purchase_price   NUMERIC(12,2),
  purchase_date    DATE,
  market_value     NUMERIC(12,2),
  owner_entity     TEXT,   -- 'Self' | 'LLC' | 'Trust' | 'Partnership'
  occupancy        TEXT DEFAULT 'vacant',   -- 'occupied' | 'vacant'
  notes            TEXT,
  photos           JSONB DEFAULT '[]',      -- Array of photo URLs
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 3: MORTGAGES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.mortgages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id      UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lender           TEXT,
  loan_number      TEXT,
  original_amount  NUMERIC(12,2) NOT NULL,
  current_balance  NUMERIC(12,2) NOT NULL,
  interest_rate    NUMERIC(6,4) NOT NULL,   -- e.g. 4.25 for 4.25%
  term_years       INTEGER NOT NULL DEFAULT 30,
  monthly_payment  NUMERIC(10,2) NOT NULL,
  due_day          INTEGER DEFAULT 1,        -- Day of month payment is due
  start_date       DATE NOT NULL,
  escrow_amount    NUMERIC(10,2) DEFAULT 0, -- Taxes + insurance in payment
  is_paid_off      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 4: TENANTS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id      UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  move_in_date     DATE,
  move_out_date    DATE,
  status           TEXT DEFAULT 'active',   -- 'active' | 'past' | 'applicant'
  portal_user_id   UUID REFERENCES auth.users(id),  -- Their portal login
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 5: LEASES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.leases (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id        UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rent_amount        NUMERIC(10,2) NOT NULL,
  deposit_amount     NUMERIC(10,2) NOT NULL,
  due_day            INTEGER DEFAULT 1,
  late_fee_amount    NUMERIC(8,2) DEFAULT 50,
  late_fee_grace_days INTEGER DEFAULT 5,
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  status             TEXT DEFAULT 'pending',  -- 'pending' | 'active' | 'expired' | 'terminated'
  -- E-signature fields
  pdf_url            TEXT,
  landlord_signed_at TIMESTAMPTZ,
  landlord_ip        TEXT,
  tenant_signed_at   TIMESTAMPTZ,
  tenant_ip          TEXT,
  -- State-specific
  state_template     TEXT DEFAULT 'FL',
  special_clauses    TEXT,
  -- Stripe
  stripe_subscription_id TEXT,   -- For AutoPay recurring billing
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 6: PAYMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id                 UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  tenant_id                UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id              UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount                   NUMERIC(10,2) NOT NULL,
  late_fee_amount          NUMERIC(8,2) DEFAULT 0,
  total_amount             NUMERIC(10,2) NOT NULL,   -- amount + late_fee
  due_date                 DATE NOT NULL,
  paid_date                TIMESTAMPTZ,
  method                   TEXT,    -- 'ach' | 'card' | 'zelle' | 'cash' | 'check' | 'autopay'
  status                   TEXT DEFAULT 'due',   -- 'due' | 'paid' | 'late' | 'failed' | 'partial'
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id         TEXT,
  notes                    TEXT,
  receipt_sent_at          TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 7: EXPENSES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id  UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  date         DATE NOT NULL,
  category     TEXT NOT NULL,   -- 'mortgage' | 'tax' | 'insurance' | 'maintenance' | 'management' | 'other'
  description  TEXT NOT NULL,
  vendor       TEXT,
  receipt_url  TEXT,
  is_deductible BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 8: MAINTENANCE REQUESTS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES public.tenants(id),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT,   -- 'plumbing' | 'hvac' | 'electrical' | 'locks' | 'pest' | 'other'
  priority      TEXT DEFAULT 'medium',   -- 'low' | 'medium' | 'high' | 'emergency'
  status        TEXT DEFAULT 'open',     -- 'open' | 'in_progress' | 'scheduled' | 'resolved'
  assigned_vendor_id UUID,              -- References vendors table
  cost          NUMERIC(10,2),
  scheduled_date DATE,
  resolved_date  DATE,
  landlord_notes TEXT,
  tenant_notes   TEXT,
  photos        JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 9: MESSAGES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender      TEXT NOT NULL,   -- 'landlord' | 'tenant'
  body        TEXT NOT NULL,
  read_at     TIMESTAMPTZ,
  sent_via    TEXT DEFAULT 'app',   -- 'app' | 'email' | 'sms'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 10: APPLICATIONS (Rental Applications)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id          UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Applicant info
  full_name            TEXT NOT NULL,
  email                TEXT NOT NULL,
  phone                TEXT,
  date_of_birth        DATE,
  -- Employment
  employer             TEXT,
  job_title            TEXT,
  monthly_income       NUMERIC(10,2),
  employment_length    TEXT,
  -- Rental history
  current_landlord     TEXT,
  current_landlord_phone TEXT,
  current_rent         NUMERIC(10,2),
  reason_for_moving    TEXT,
  -- References
  reference_1_name     TEXT,
  reference_1_phone    TEXT,
  reference_2_name     TEXT,
  reference_2_phone    TEXT,
  -- Status
  status               TEXT DEFAULT 'received',  -- 'received' | 'screening' | 'approved' | 'declined'
  -- Screening results (from TransUnion)
  credit_score         INTEGER,
  eviction_history     TEXT,
  criminal_record      TEXT,
  income_verified      NUMERIC(10,2),
  screening_report_url TEXT,
  recommendation       TEXT,   -- 'approve' | 'review' | 'decline'
  ai_summary           TEXT,
  -- Stripe
  screening_payment_id TEXT,
  desired_move_in      DATE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 11: LISTINGS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.listings (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id         UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rent_amount         NUMERIC(10,2) NOT NULL,
  deposit_amount      NUMERIC(10,2),
  available_date      DATE,
  lease_term          TEXT DEFAULT '12_months',
  description         TEXT,
  photos              JSONB DEFAULT '[]',
  amenities           JSONB DEFAULT '[]',
  pet_policy          TEXT DEFAULT 'no_pets',
  utilities_included  JSONB DEFAULT '[]',
  is_active           BOOLEAN DEFAULT TRUE,
  -- Syndication status per platform
  zillow_listed       BOOLEAN DEFAULT FALSE,
  zillow_id           TEXT,
  zillow_listed_at    TIMESTAMPTZ,
  apartments_listed   BOOLEAN DEFAULT FALSE,
  apartments_id       TEXT,
  realtor_listed      BOOLEAN DEFAULT FALSE,
  zumper_listed       BOOLEAN DEFAULT FALSE,
  facebook_listed     BOOLEAN DEFAULT FALSE,
  craigslist_listed   BOOLEAN DEFAULT FALSE,
  -- Stats
  views_count         INTEGER DEFAULT 0,
  leads_count         INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLE 12: VENDORS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  company     TEXT,
  trade       TEXT,   -- 'plumber' | 'electrician' | 'hvac' | 'handyman' | 'cleaner' | 'roofer'
  phone       TEXT,
  email       TEXT,
  license     TEXT,
  insured     BOOLEAN DEFAULT FALSE,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  hourly_rate NUMERIC(8,2),
  notes       TEXT,
  total_paid  NUMERIC(12,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES (speed up common queries)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON public.tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON public.leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON public.payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON public.expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON public.messages(property_id);
CREATE INDEX IF NOT EXISTS idx_applications_property_id ON public.applications(property_id);
CREATE INDEX IF NOT EXISTS idx_listings_property_id ON public.listings(property_id);

-- ================================================================
-- ROW LEVEL SECURITY (landlords only see their own data)
-- ================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortgages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Users: can only see and edit their own profile
CREATE POLICY "users_own" ON public.users
  FOR ALL USING (id = auth.uid());

-- All other tables: user_id must match the logged-in user
CREATE POLICY "properties_own" ON public.properties
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "mortgages_own" ON public.mortgages
  FOR ALL USING (property_id IN (
    SELECT id FROM public.properties WHERE user_id = auth.uid()
  ));

CREATE POLICY "tenants_own" ON public.tenants
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "leases_own" ON public.leases
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "payments_own" ON public.payments
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "expenses_own" ON public.expenses
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "maintenance_own" ON public.maintenance_requests
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "messages_own" ON public.messages
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "applications_own" ON public.applications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "listings_own" ON public.listings
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "vendors_own" ON public.vendors
  FOR ALL USING (user_id = auth.uid());

-- ================================================================
-- TRIGGER: Auto-create user profile on signup
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- TRIGGER: Update updated_at timestamps automatically
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mortgages_updated_at BEFORE UPDATE ON public.mortgages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
SELECT 'PropManager Pro database schema created successfully! 
12 tables + indexes + row-level security + triggers are all set up.' AS status;
