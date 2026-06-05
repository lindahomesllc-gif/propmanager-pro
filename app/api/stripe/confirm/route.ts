import { NextResponse } from 'next/server'
import { stripe, svc, getUserFromRequest } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Called when the tenant returns from Stripe Checkout. Retrieves the session on
// the landlord's connected account; if it's paid, marks the payment Paid.
// (A no-webhook way to confirm card payments instantly.)
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const { paymentId, sessionId } = await request.json().catch(() => ({}))
    if (!paymentId || !sessionId) return NextResponse.json({ error: 'missing params' }, { status: 400 })

    const { data: pay } = await svc.from('payments').select('id, status, user_id, tenants(email)').eq('id', paymentId).single()
    if (!pay) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if ((pay as any).tenants?.email?.toLowerCase() !== (user.email || '').toLowerCase())
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (pay.status === 'paid') return NextResponse.json({ status: 'paid' })

    const { data: landlord } = await svc.from('users').select('stripe_account_id').eq('id', pay.user_id).single()
    const acct = landlord?.stripe_account_id as string | null
    if (!acct) return NextResponse.json({ error: 'no account' }, { status: 400 })

    const session = await stripe.checkout.sessions.retrieve(sessionId, { stripeAccount: acct })
    if (session.payment_status === 'paid' || session.status === 'complete') {
      await svc.from('payments').update({
        status: 'paid',
        amount_paid: (session.amount_total || 0) / 100,
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: session.payment_method_types?.[0] === 'us_bank_account' ? 'ach' : 'card',
      }).eq('id', paymentId)
      return NextResponse.json({ status: 'paid' })
    }
    return NextResponse.json({ status: session.payment_status || 'processing' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
