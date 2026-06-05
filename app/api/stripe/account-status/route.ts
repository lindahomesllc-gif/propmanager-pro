import { NextResponse } from 'next/server'
import { stripe, getAuth } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Report whether the landlord's connected account can accept payments yet.
export async function GET(request: Request) {
  const { user, db } = await getAuth(request)
  if (!user || !db) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await db.from('users').select('stripe_account_id').eq('id', user.id).single()
  const accountId = profile?.stripe_account_id as string | null
  if (!accountId) return NextResponse.json({ hasAccount: false, connected: false })

  try {
    const account = await stripe.accounts.retrieve(accountId)
    return NextResponse.json({
      hasAccount: true,
      connected: !!account.charges_enabled,
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
    })
  } catch (e: any) {
    return NextResponse.json({ hasAccount: true, connected: false, error: e?.message || String(e) })
  }
}
