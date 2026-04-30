// app/api/stripe/connect/route.ts
// POST — Creates Stripe Connect account for a landlord and returns onboarding URL
// Called when landlord clicks "Connect Bank Account" in settings

import { createClient } from '@/lib/supabase/server'
import { createLandlordStripeAccount, getLandlordOnboardingLink, getOrCreateCustomer } from '@/lib/stripe/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('stripe_account_id, stripe_customer_id, full_name, email')
    .eq('id', user.id)
    .single()

  let stripeAccountId = profile?.stripe_account_id
  let stripeCustomerId = profile?.stripe_customer_id

  // Create Stripe Customer if needed (for subscriptions)
  if (!stripeCustomerId) {
    const customer = await getOrCreateCustomer(
      user.email!,
      profile?.full_name || ''
    )
    stripeCustomerId = customer.id

    await supabase
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id)
  }

  // Create Stripe Connect account if needed (for receiving rent)
  if (!stripeAccountId) {
    const account = await createLandlordStripeAccount(user.email!)
    stripeAccountId = account.id

    await supabase
      .from('users')
      .update({ stripe_account_id: stripeAccountId })
      .eq('id', user.id)
  }

  // Get onboarding link — sends landlord to Stripe to enter bank details
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const onboardingUrl = await getLandlordOnboardingLink(stripeAccountId, appUrl)

  return NextResponse.json({ onboarding_url: onboardingUrl })
}

// GET — Check if landlord's Stripe account is fully onboarded
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_account_id) {
    return NextResponse.json({ connected: false })
  }

  // Check account status with Stripe
  const { stripe } = await import('@/lib/stripe/client')
  const account = await stripe.accounts.retrieve(profile.stripe_account_id)

  return NextResponse.json({
    connected: account.details_submitted && account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    charges_enabled: account.charges_enabled,
  })
}
