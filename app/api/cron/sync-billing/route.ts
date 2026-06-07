import { NextResponse } from 'next/server'
import { stripe, svc } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Daily reconcile of each landlord's subscription against Stripe — covers
// renewals, cancellations, and failed payments without needing a webhook.
// Add ?dryRun=1 to preview. Gated by CRON_SECRET like the other crons.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ status: 'setup_required', message: 'Set CRON_SECRET.' }, { status: 503 })
  const url = new URL(request.url)
  const auth = request.headers.get('authorization')
  if (auth !== 'Bearer ' + secret && url.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ status: 'setup_required', message: 'Set STRIPE_SECRET_KEY.' }, { status: 503 })
  const dryRun = url.searchParams.get('dryRun') === '1'

  // every landlord that has a platform customer (i.e. has started checkout)
  const { data: users } = await svc.from('users').select('id, stripe_customer_id, subscription_status').not('stripe_customer_id', 'is', null)

  const map = (s: string) =>
    (s === 'active' || s === 'trialing') ? 'active'
    : (s === 'past_due' || s === 'unpaid') ? 'past_due'
    : 'canceled'

  const changes: any[] = []
  for (const u of users || []) {
    const subs = await stripe.subscriptions.list({ customer: u.stripe_customer_id, status: 'all', limit: 1 })
    const sub = subs.data[0]
    // no subscription record at all → leave trial/other states alone
    if (!sub) continue
    const next = map(sub.status)
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null
    if (next !== u.subscription_status) changes.push({ id: u.id, from: u.subscription_status, to: next })
    if (!dryRun) {
      await svc.from('users').update({ subscription_status: next, current_period_end: periodEnd }).eq('id', u.id)
    }
  }

  return NextResponse.json({ status: dryRun ? 'dry_run' : 'done', checked: (users || []).length, changes })
}
