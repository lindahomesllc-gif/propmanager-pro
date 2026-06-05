import { NextResponse } from 'next/server'
import { stripe, getAuth } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Create (or reuse) the landlord's Stripe Connect Express account and return a
// hosted onboarding link. The landlord collects bank/identity info on Stripe.
export async function POST(request: Request) {
  const { user, db } = await getAuth(request)
  if (!user || !db) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' }, { status: 503 })
  }
  try {
    const { data: profile } = await db.from('users').select('stripe_account_id').eq('id', user.id).single()
    let accountId = profile?.stripe_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          us_bank_account_ach_payments: { requested: true },
        },
      })
      accountId = account.id
      const { error: upErr } = await db.from('users').update({ stripe_account_id: accountId }).eq('id', user.id)
      if (upErr) return NextResponse.json({ error: 'Could not save account: ' + upErr.message }, { status: 500 })
    }

    const origin = new URL(request.url).origin
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: origin + '/get-paid?refresh=1',
      return_url: origin + '/get-paid?connected=1',
      type: 'account_onboarding',
    })
    return NextResponse.json({ url: link.url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
