import { NextResponse } from 'next/server'
import { stripe, svc, getUserFromRequest } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Called when the landlord returns from Checkout. Retrieves the session +
// subscription and marks them active in our DB (no webhook needed for the initial
// activation; the daily sync-billing cron keeps status fresh afterwards).
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { sessionId } = await request.json().catch(() => ({}))
  if (!sessionId) return NextResponse.json({ error: 'missing sessionId' }, { status: 400 })

  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
  const sub: any = session.subscription
  if (!sub || typeof sub === 'string') return NextResponse.json({ active: false })

  const active = sub.status === 'active' || sub.status === 'trialing'
  if (active) {
    await svc.from('users').update({
      subscription_status: 'active',
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : sub.customer,
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    }).eq('id', user.id)
  }
  return NextResponse.json({ active })
}
