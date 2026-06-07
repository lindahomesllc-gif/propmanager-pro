import { supabase } from '@/lib/supabase'

export type Billing = {
  status: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  stripeCustomerId: string | null
  entitled: boolean
  inTrial: boolean
  trialDaysLeft: number
}

// Reads the current user's subscription state from public.users and derives
// whether they may use the app. FAIL-OPEN: any error (missing columns, network,
// RLS) returns entitled=true so a hiccup never locks a landlord out of their data.
export async function fetchBilling(): Promise<Billing> {
  const open: Billing = { status: 'active', trialEndsAt: null, currentPeriodEnd: null, stripeCustomerId: null, entitled: true, inTrial: false, trialDaysLeft: 0 }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return open
    const { data, error } = await supabase.from('users')
      .select('subscription_status, trial_ends_at, current_period_end, stripe_customer_id')
      .eq('id', user.id).single()
    if (error || !data) return open
    const status = data.subscription_status || 'trialing'
    const trialEndsAt = data.trial_ends_at || null
    const trialMs = trialEndsAt ? new Date(trialEndsAt).getTime() - Date.now() : 0
    const inTrial = status === 'trialing' && trialMs > 0
    const entitled = status === 'active' || inTrial
    return {
      status,
      trialEndsAt,
      currentPeriodEnd: data.current_period_end || null,
      stripeCustomerId: data.stripe_customer_id || null,
      entitled,
      inTrial,
      trialDaysLeft: Math.max(0, Math.ceil(trialMs / 86400000)),
    }
  } catch {
    return open
  }
}
