import { NextResponse } from 'next/server'
import { stripe, svc } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Stripe calls this when a rent payment completes. It verifies the signature,
// then marks the matching payment row Paid. (Configure this endpoint in Stripe
// as a CONNECT webhook so it receives connected-account events; set
// STRIPE_WEBHOOK_SECRET to that endpoint's signing secret.)
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature') || ''
  const body = await request.text()

  let event: any
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || '')
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid signature: ' + (e?.message || e) }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object
    const paymentId = s?.metadata?.payment_id
    if (paymentId) {
      await svc.from('payments').update({
        status: 'paid',
        amount_paid: (s.amount_total || 0) / 100,
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: s.payment_method_types?.[0] === 'us_bank_account' ? 'ach' : 'card',
      }).eq('id', paymentId)
    }
  }

  return NextResponse.json({ received: true })
}
