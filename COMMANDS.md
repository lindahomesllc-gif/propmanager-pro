# PropManager Pro — Command Reference
# Copy and paste these commands exactly as shown

# ═══════════════════════════════════════════════════════════
# STEP 1: INSTALL NODE.JS (if you don't have it)
# ═══════════════════════════════════════════════════════════
# Go to: https://nodejs.org → Download the LTS version
# After installing, verify with:
node --version   # Should show v18 or higher
npm --version    # Should show v9 or higher


# ═══════════════════════════════════════════════════════════
# STEP 2: CREATE YOUR PROJECT
# ═══════════════════════════════════════════════════════════
# Open Terminal (Mac) or Command Prompt (Windows)
# Navigate to where you want the project:
cd Desktop

# Create the Next.js project:
npx create-next-app@14 propmanager-pro --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"

# Enter the project folder:
cd propmanager-pro


# ═══════════════════════════════════════════════════════════
# STEP 3: INSTALL ALL DEPENDENCIES
# ═══════════════════════════════════════════════════════════
npm install @supabase/supabase-js @supabase/ssr stripe @stripe/stripe-js @stripe/react-stripe-js resend recharts date-fns clsx tailwind-merge react-hook-form zod @hookform/resolvers lucide-react sonner


# ═══════════════════════════════════════════════════════════
# STEP 4: SET UP ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════
# Create the .env.local file:
# Mac:
touch .env.local
open .env.local    # Opens in TextEdit — paste the contents from .env.example

# Windows:
# Right-click in the propmanager-pro folder → New → Text Document
# Rename it to: .env.local (make sure it's not .env.local.txt)

# Fill in these values from Supabase:
# NEXT_PUBLIC_SUPABASE_URL → Supabase → Settings → API → Project URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY → Supabase → Settings → API → anon public key
# SUPABASE_SERVICE_ROLE_KEY → Supabase → Settings → API → service_role key (keep secret!)


# ═══════════════════════════════════════════════════════════
# STEP 5: SET UP SUPABASE DATABASE
# ═══════════════════════════════════════════════════════════
# 1. Go to your Supabase project
# 2. Click "SQL Editor" in the left sidebar
# 3. Click "New query"
# 4. Copy the ENTIRE contents of supabase/schema.sql
# 5. Paste it into the SQL editor
# 6. Click "Run" (or press Cmd+Enter)
# 7. You should see: "PropManager Pro database schema created successfully!"

# Then optionally run the seed data:
# 1. Go to Authentication → Users → copy your user UUID
# 2. Open supabase/seed.sql
# 3. Replace 'YOUR_USER_ID_HERE' with your UUID
# 4. Run in SQL Editor


# ═══════════════════════════════════════════════════════════
# STEP 6: COPY THE PROJECT FILES
# ═══════════════════════════════════════════════════════════
# Copy all the files from this project into your propmanager-pro folder.
# The folder structure should match exactly.
# Make sure to replace the auto-generated app/page.tsx with our version.


# ═══════════════════════════════════════════════════════════
# STEP 7: RUN LOCALLY
# ═══════════════════════════════════════════════════════════
npm run dev

# Open your browser to: http://localhost:3000
# You should see the login page!
# Sign up with your email → check email for confirmation → log in → dashboard


# ═══════════════════════════════════════════════════════════
# STEP 8: DEPLOY TO VERCEL
# ═══════════════════════════════════════════════════════════
# Install Vercel CLI:
npm install -g vercel

# Push code to GitHub first:
git init
git add .
git commit -m "Initial PropManager Pro commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/propmanager-pro.git
git push -u origin main

# Deploy to Vercel:
vercel

# When prompted:
# - Link to existing project? No
# - What's your project name? propmanager-pro
# - Which directory? ./  (just press Enter)
# - Override settings? No

# After deploy, add environment variables in Vercel:
# Vercel Dashboard → Your project → Settings → Environment Variables
# Add ALL the variables from your .env.local file


# ═══════════════════════════════════════════════════════════
# STEP 9: SET UP STRIPE WEBHOOKS
# ═══════════════════════════════════════════════════════════
# 1. Go to: dashboard.stripe.com → Developers → Webhooks
# 2. Click "Add endpoint"
# 3. URL: https://YOUR-VERCEL-URL.vercel.app/api/webhooks/stripe
# 4. Select events:
#    - payment_intent.succeeded
#    - payment_intent.payment_failed
#    - customer.subscription.created
#    - customer.subscription.updated
#    - customer.subscription.deleted
# 5. Copy the "Signing secret" → add to Vercel as STRIPE_WEBHOOK_SECRET

# For local testing, use Stripe CLI:
brew install stripe/stripe-cli/stripe   # Mac
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook secret it gives you → add to .env.local as STRIPE_WEBHOOK_SECRET


# ═══════════════════════════════════════════════════════════
# USEFUL COMMANDS DURING DEVELOPMENT
# ═══════════════════════════════════════════════════════════

# Run development server:
npm run dev

# Check for TypeScript errors:
npx tsc --noEmit

# Check for lint errors:
npm run lint

# Build for production (catch build errors before deploying):
npm run build

# Deploy latest changes to Vercel:
git add .
git commit -m "Your commit message here"
git push
# Vercel auto-deploys when you push to main!

# View Vercel deployment logs:
vercel logs

# Open Supabase dashboard:
# https://app.supabase.com/project/YOUR_PROJECT_ID


# ═══════════════════════════════════════════════════════════
# TROUBLESHOOTING
# ═══════════════════════════════════════════════════════════

# "Module not found" error:
npm install   # Re-install all dependencies

# "NEXT_PUBLIC_SUPABASE_URL is not defined":
# Make sure .env.local exists and has the correct values
# Restart the dev server after changing .env.local

# Supabase RLS blocking queries:
# Check your user is logged in
# Verify the user_id in the row matches auth.uid()
# Temporarily disable RLS in Supabase to test: 
# ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
# (Re-enable before going to production!)

# Stripe webhook "Invalid signature":
# Make sure STRIPE_WEBHOOK_SECRET matches exactly what Stripe Dashboard shows
# Use the Stripe CLI for local testing (see Step 9 above)
