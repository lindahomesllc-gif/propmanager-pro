import { NextResponse } from 'next/server'
import { stripe, svc, getUserFromRequest } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// A tenant pays a specific rent payment. Creates a Stripe Checkout Session as a
// DIRECT charge on the landlord's connected account (landlord receives funds and
// absorbs the fee). The webhook marks the payment paid.
export async function POST(request: Request) {
  const user = await getUserFromRequest(request) // the tenant
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 })

  try {
    const { paymentId } = await request.json().catch(() => ({}))
    if (!paymentId) return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })

    const { data: pay } = await svc
      .from('payments')
      .select('id, amount_due, status, user_id, tenants(email), properties(address)')
      .eq('id', paymentId)
      .single()
    if (!pay) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // Ownership: the logged-in tenant must own this payment.
    const payerEmail = (pay as any).tenants?.email?.toLowerCase()
    if (!payerEmail || payerEmail !== (user.email || '').toLowerCase()) {
      return NextResponse.json({ error: 'Not your payment' }, { status: 403 })
    }
    if (pay.status === 'paid') return NextResponse.json({ error: 'This payment is already paid.' }, { status: 400 })

    const { data: landlord } = await svc.from('users').select('stripe_account_id').eq('id', pay.user_id).single()
    const acct = landlord?.stripe_account_id as string | null
    if (!acct) return NextResponse.json({ error: 'Your landlord hasn’t set up online rent payments yet.' }, { status: 400 })

    const origin = new URL(request.url).origin
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card', 'us_bank_account'],
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(Number(pay.amount_due) * 100),
            product_data: { name: 'Rent — ' + ((pay as any).properties?.address || 'Property') },
          },
        }],
        success_url: origin + '/portal/payments?paid=1',
        cancel_url: origin + '/portal/payments',
        metadata: { payment_id: pay.id },
      },
      { stripeAccount: acct }, // direct charge on the landlord's connected account
    )

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
