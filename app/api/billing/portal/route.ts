import { NextResponse } from 'next/server'
import { stripe, svc, getUserFromRequest } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Opens Stripe's hosted Customer Portal so the landlord can update their card,
// view invoices, or cancel — no billing UI for us to build/maintain.
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: prof } = await svc.from('users').select('stripe_customer_id').eq('id', user.id).single()
  if (!prof?.stripe_customer_id) return NextResponse.json({ error: 'No subscription yet.' }, { status: 400 })

  const origin = new URL(request.url).origin
  const portal = await stripe.billingPortal.sessions.create({
    customer: prof.stripe_customer_id,
    return_url: origin + '/billing',
  })
  return NextResponse.json({ url: portal.url })
}
