import { NextResponse } from 'next/server'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Daily due-dates digest. Runs via Vercel Cron (see vercel.json).
// Sends an email through SendGrid when SENDGRID_API_KEY / NOTIFY_EMAIL / NOTIFY_FROM
// are set; otherwise returns a JSON preview so you can dry-run it in the browser.
export async function GET(request: Request) {
  // Auth: always require CRON_SECRET so the digest (which contains tenant
  // names + amounts) is never publicly readable. Vercel Cron automatically
  // sends it as a Bearer token; manual testing can use ?key=<secret>.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ status: 'setup_required', message: 'Set a CRON_SECRET env var (any random string) in Vercel to enable this endpoint.' }, { status: 503 })
  }
  const url = new URL(request.url)
  const auth = request.headers.get('authorization')
  if (auth !== 'Bearer ' + secret && url.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - startOfToday.getTime()) / 86400000)

  const [pay, lea, mai, props] = await Promise.all([
    supabase.from('payments').select('*, tenants(full_name), properties(address)').eq('user_id', USER_ID).in('status', ['due', 'upcoming', 'late']).order('due_date'),
    supabase.from('leases').select('*, tenants(full_name), properties(address)').eq('user_id', USER_ID).eq('status', 'executed'),
    supabase.from('maintenance').select('*, properties(address)').eq('user_id', USER_ID).in('status', ['open', 'scheduled', 'in_progress']),
    supabase.from('properties').select('id, address, insurance_expires, tax_due_date, annual_tax').eq('user_id', USER_ID),
  ])

  type Item = { title: string; sub: string; days: number; amount: number }
  const items: Item[] = []

  ;(pay.data || []).forEach((p: any) => {
    const d = daysUntil(p.due_date)
    if (d <= 7) items.push({ title: (p.tenants?.full_name || 'Tenant') + ' — Rent ' + (p.status === 'late' ? 'Overdue' : 'Due'), sub: formatDate(p.due_date) + ' · ' + fm(p.amount_due), days: d, amount: p.amount_due || 0 })
  })
  ;(lea.data || []).forEach((l: any) => {
    if (!l.end_date) return
    const d = daysUntil(l.end_date)
    if (d <= 90 && d >= -30) items.push({ title: (l.tenants?.full_name || 'Tenant') + ' — Lease ' + (d < 0 ? 'Expired' : 'Expires'), sub: formatDate(l.end_date) + ' · ' + (l.properties?.address || ''), days: d, amount: 0 })
  })
  ;(props.data || []).forEach((p: any) => {
    if (p.insurance_expires) { const d = daysUntil(p.insurance_expires); if (d <= 30) items.push({ title: 'Insurance — ' + p.address, sub: 'Renews ' + formatDate(p.insurance_expires), days: d, amount: 0 }) }
    if (p.tax_due_date) { const d = daysUntil(p.tax_due_date); if (d <= 30) items.push({ title: 'Property Tax — ' + p.address, sub: 'Due ' + formatDate(p.tax_due_date) + (p.annual_tax ? ' · ' + fm(p.annual_tax) : ''), days: d, amount: p.annual_tax || 0 }) }
  })
  ;(mai.data || []).forEach((m: any) => {
    if (m.priority === 'emergency' || m.priority === 'high') items.push({ title: '🔧 ' + m.title, sub: (m.properties?.address || '') + ' · ' + m.priority + ' priority', days: 0, amount: 0 })
  })

  items.sort((a, b) => a.days - b.days)

  const overdue = items.filter(i => i.days < 0).length
  const dueSoon = items.filter(i => i.days >= 0 && i.days <= 7).length
  const atRisk = items.filter(i => i.days <= 7).reduce((s, i) => s + i.amount, 0)
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const rowHtml = (i: Item) => `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #eee">
      <div style="font-weight:600;color:#1A1A1A;font-size:14px">${i.title}</div>
      <div style="font-size:12px;color:#888;margin-top:2px">${i.sub}</div>
    </td>
    <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;font-size:12px;font-weight:700;color:${i.days < 0 ? '#DC2626' : i.days <= 7 ? '#D97706' : '#2563EB'}">
      ${i.days < 0 ? Math.abs(i.days) + 'd overdue' : i.days === 0 ? 'Today' : 'in ' + i.days + 'd'}
    </td></tr>`

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:8px">
    <div style="font-size:20px;font-weight:800;color:#2D6A4F">PropManager Pro</div>
    <div style="font-size:13px;color:#888;margin-bottom:14px">Daily Digest · ${dateLabel}</div>
    <div style="font-size:14px;margin-bottom:16px">
      <b style="color:#DC2626">${overdue} overdue</b> &middot;
      <b style="color:#D97706">${dueSoon} due this week</b> &middot;
      <b style="color:#1A1A1A">${fm(atRisk)} due soon</b>
    </div>
    ${items.length ? `<table style="width:100%;border-collapse:collapse">${items.map(rowHtml).join('')}</table>` : '<div style="padding:16px;background:#F0FDF4;border-radius:8px;color:#166534">✅ All clear — nothing due in the next week.</div>'}
    <div style="margin-top:22px">
      <a href="https://propmanager-pro-nine.vercel.app/alerts" style="background:#2D6A4F;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">Open Due Dates &rarr;</a>
    </div>
  </div>`

  const apiKey = process.env.SENDGRID_API_KEY?.trim()
  const to = process.env.NOTIFY_EMAIL?.trim()
  const from = process.env.NOTIFY_FROM?.trim()

  if (!apiKey || !to || !from) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Set SENDGRID_API_KEY, NOTIFY_EMAIL, and NOTIFY_FROM in Vercel env vars to enable sending. This is a dry-run preview.',
      summary: { overdue, dueSoon, atRisk, items: items.length },
      previewHtml: html,
    })
  }

  // Guard against a malformed key (e.g. wrong value pasted into the env var).
  if (!/^SG\.[\w.\-]+$/.test(apiKey)) {
    return NextResponse.json({
      status: 'bad_api_key',
      message: 'SENDGRID_API_KEY does not look valid. It must start with "SG.", contain no spaces/emoji/extra text, and be ~69 characters. Re-check the Vercel env var.',
      apiKeyLen: apiKey.length,
    }, { status: 400 })
  }

  // Don't send an empty digest every day — skip when nothing is due.
  if (items.length === 0) {
    return NextResponse.json({ status: 'skipped_empty', summary: { overdue, dueSoon, atRisk } })
  }

  try {
    const toLatin1 = (s: string) => s.replace(/[–—]/g, '-').replace(/[^\x00-\xFF]/g, '')
    const payload = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: 'PropManager Pro' },
      subject: toLatin1(`Due Dates: ${overdue} overdue, ${dueSoon} due this week`),
      content: [{ type: 'text/html', value: toLatin1(html) }],
    })
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      // Encode to UTF-8 bytes so emoji/em-dash in the body don't trip the
      // runtime's ByteString header coercion.
      body: new TextEncoder().encode(payload),
    })
    if (!res.ok) {
      const detail = await res.text()
      return NextResponse.json({ status: 'send_failed', code: res.status, detail }, { status: 502 })
    }
    return NextResponse.json({ status: 'sent', to, summary: { overdue, dueSoon, atRisk, items: items.length } })
  } catch (e: any) {
    return NextResponse.json({ status: 'error', message: String(e?.message || e) }, { status: 500 })
  }
}
