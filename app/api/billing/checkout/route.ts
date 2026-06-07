import { NextResponse } from 'next/server'
import { stripe, svc, getUserFromRequest } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Starts a PropManager subscription ($29/mo) for the logged-in landlord.
// Creates/reuses a platform Stripe customer, then opens a Checkout Session in
// subscription mode. (Separate from the Connect flow used for tenant rent.)
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 })

  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const origin = new URL(request.url).origin

  // find or create this landlord's platform customer
  const { data: prof } = await svc.from('users').select('stripe_customer_id, email').eq('id', user.id).single()
  let customerId = prof?.stripe_customer_id || null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: prof?.email || user.email || undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await svc.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  // Define the $29/mo plan inline so there's no dashboard product/price or env var
  // to set up — Stripe creates the recurring price on the fly.
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'PropManager Pro' },
        unit_amount: 2900,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    allow_promotion_codes: true,
    success_url: origin + '/billing?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + '/billing?canceled=1',
  })

  return NextResponse.json({ url: session.url })
}
