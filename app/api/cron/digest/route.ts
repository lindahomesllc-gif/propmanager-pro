import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fm, formatDate } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = 'https://sugfedlfmvmbcnblhnuc.supabase.co'

type Item = { title: string; sub: string; days: number; amount: number }

// Multi-tenant daily due-dates digest. Runs via Vercel Cron (see vercel.json).
// Uses the service-role key to read every landlord's data (bypassing RLS), then
// emails each landlord their own digest to their account email via SendGrid.
export async function GET(request: Request) {
  // Auth — always require CRON_SECRET (digest contains tenant PII).
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ status: 'setup_required', message: 'Set CRON_SECRET in Vercel.' }, { status: 503 })
  }
  const url = new URL(request.url)
  const auth = request.headers.get('authorization')
  if (auth !== 'Bearer ' + secret && url.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.SENDGRID_API_KEY?.trim()
  const from = process.env.NOTIFY_FROM?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) {
    return NextResponse.json({ status: 'setup_required', message: 'Set SUPABASE_SERVICE_ROLE_KEY in Vercel (server-only).' }, { status: 503 })
  }
  const svc = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - startOfToday.getTime()) / 86400000)
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  function buildItems(pay: any[], lea: any[], mai: any[], props: any[]): Item[] {
    const items: Item[] = []
    ;(pay || []).forEach((p: any) => {
      const d = daysUntil(p.due_date)
      if (d <= 7) items.push({ title: (p.tenants?.full_name || 'Tenant') + ' — Rent ' + (p.status === 'late' ? 'Overdue' : 'Due'), sub: formatDate(p.due_date) + ' · ' + fm(p.amount_due), days: d, amount: p.amount_due || 0 })
    })
    ;(lea || []).forEach((l: any) => {
      if (!l.end_date) return
      const d = daysUntil(l.end_date)
      if (d <= 90 && d >= -30) items.push({ title: (l.tenants?.full_name || 'Tenant') + ' — Lease ' + (d < 0 ? 'Expired' : 'Expires'), sub: formatDate(l.end_date) + ' · ' + (l.properties?.address || ''), days: d, amount: 0 })
    })
    ;(props || []).forEach((p: any) => {
      if (p.insurance_expires) { const d = daysUntil(p.insurance_expires); if (d <= 30) items.push({ title: 'Insurance — ' + p.address, sub: 'Renews ' + formatDate(p.insurance_expires), days: d, amount: 0 }) }
      if (p.tax_due_date) { const d = daysUntil(p.tax_due_date); if (d <= 30) items.push({ title: 'Property Tax — ' + p.address, sub: 'Due ' + formatDate(p.tax_due_date) + (p.annual_tax ? ' · ' + fm(p.annual_tax) : ''), days: d, amount: p.annual_tax || 0 }) }
    })
    ;(mai || []).forEach((m: any) => {
      if (m.priority === 'emergency' || m.priority === 'high') items.push({ title: 'Maintenance — ' + m.title, sub: (m.properties?.address || '') + ' · ' + m.priority + ' priority', days: 0, amount: 0 })
    })
    return items.sort((a, b) => a.days - b.days)
  }

  function buildHtml(items: Item[]) {
    const overdue = items.filter(i => i.days < 0).length
    const dueSoon = items.filter(i => i.days >= 0 && i.days <= 7).length
    const atRisk = items.filter(i => i.days <= 7).reduce((s, i) => s + i.amount, 0)
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
      <table style="width:100%;border-collapse:collapse">${items.map(rowHtml).join('')}</table>
      <div style="margin-top:22px">
        <a href="https://propmanager-pro-nine.vercel.app/alerts" style="background:#2D6A4F;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">Open Due Dates &rarr;</a>
      </div>
    </div>`
    return { html, overdue, dueSoon }
  }

  const toLatin1 = (s: string) => s.replace(/[–—]/g, '-').replace(/[^\x00-\xFF]/g, '')
  async function sendEmail(to: string, subject: string, html: string) {
    const payload = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: 'PropManager Pro' },
      subject: toLatin1(subject),
      content: [{ type: 'text/html', value: toLatin1(html) }],
    })
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: new TextEncoder().encode(payload),
    })
    return res.ok ? { ok: true } : { ok: false, code: res.status, detail: await res.text() }
  }

  // Every landlord
  const { data: landlords, error: lErr } = await svc.from('users').select('id, email, full_name')
  if (lErr) return NextResponse.json({ status: 'error', message: lErr.message }, { status: 500 })

  const configured = !!(apiKey && from && /^SG\.[\w.\-]+$/.test(apiKey || ''))
  const results: any[] = []

  for (const u of (landlords || [])) {
    if (!u.email) continue
    const [pay, lea, mai, props] = await Promise.all([
      svc.from('payments').select('*, tenants(full_name), properties(address)').eq('user_id', u.id).in('status', ['due', 'upcoming', 'late']).order('due_date'),
      svc.from('leases').select('*, tenants(full_name), properties(address)').eq('user_id', u.id).eq('status', 'executed'),
      svc.from('maintenance').select('*, properties(address)').eq('user_id', u.id).in('status', ['open', 'scheduled', 'in_progress']),
      svc.from('properties').select('id, address, insurance_expires, tax_due_date, annual_tax').eq('user_id', u.id),
    ])
    const items = buildItems(pay.data || [], lea.data || [], mai.data || [], props.data || [])
    if (items.length === 0) { results.push({ to: u.email, status: 'skipped_empty' }); continue }
    const { html, overdue, dueSoon } = buildHtml(items)
    if (!configured) { results.push({ to: u.email, status: 'not_configured', items: items.length }); continue }
    try {
      const r = await sendEmail(u.email, `Due Dates: ${overdue} overdue, ${dueSoon} due this week`, html)
      results.push({ to: u.email, status: r.ok ? 'sent' : 'send_failed', ...(r.ok ? {} : { code: r.code }) })
    } catch (e: any) {
      results.push({ to: u.email, status: 'error', message: String(e?.message || e) })
    }
  }

  return NextResponse.json({ status: 'done', landlords: (landlords || []).length, sent: results.filter(r => r.status === 'sent').length, results })
}
