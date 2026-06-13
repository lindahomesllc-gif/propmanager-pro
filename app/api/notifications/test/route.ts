import { NextResponse } from 'next/server'
import { svc, getUserFromRequest } from '@/lib/stripe'
import { gatherItems, digestSubject, digestHtml, smsText, sendEmail, sendSMS, PROD_URL } from '@/lib/notify'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// "Send me a test now" — sends the digest to the calling landlord immediately on
// every channel they have set up, so they can confirm delivery without waiting
// for the daily cron. If nothing is due, sends an "all caught up" confirmation.
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: row } = await svc.from('users').select('notify_phone, email').eq('id', user.id).single()
  const email = row?.email || user.email
  const phone = row?.notify_phone

  const items = await gatherItems(svc, user.id)
  const out: any = { items: items.length }

  if (items.length > 0) {
    if (email) { const r = await sendEmail(email, '[Test] ' + digestSubject(items), digestHtml(items)); out.email = r.ok ? 'sent' : (r.reason || 'failed_' + (r.code || '')) }
    if (phone) { const r = await sendSMS(phone, '[Test] ' + smsText(items)); out.sms = r.ok ? 'sent' : (r.reason || 'failed_' + (r.code || '')) }
  } else {
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:8px"><div style="font-size:20px;font-weight:800;color:#2D6A4F">PropManager Pro</div><div style="font-size:14px;color:#1A1A1A;margin:12px 0">✅ Test successful — and you're all caught up. Nothing is due right now. When something is, this is where it'll land.</div><a href="${PROD_URL}/alerts" style="background:#2D6A4F;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">Open Due Dates &rarr;</a></div>`
    if (email) { const r = await sendEmail(email, '[Test] PropManager Pro notifications', html); out.email = r.ok ? 'sent' : (r.reason || 'failed_' + (r.code || '')) }
    if (phone) { const r = await sendSMS(phone, 'PropManager Pro: test OK — you are all caught up. ' + PROD_URL + '/alerts'); out.sms = r.ok ? 'sent' : (r.reason || 'failed_' + (r.code || '')) }
  }
  return NextResponse.json({ ok: true, ...out })
}
