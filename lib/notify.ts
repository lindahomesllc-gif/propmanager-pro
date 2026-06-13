import { fm, formatDate, nextAnnualReportDue } from '@/lib/supabase'

// Shared notification engine — used by the daily digest cron AND the "send test"
// button. Gathers a landlord's due items, builds the email HTML + SMS text, and
// sends via SendGrid (email) and Twilio (SMS). All sends are env-gated.
export const PROD_URL = 'https://propmanager-pro-nine.vercel.app'

export type Item = { title: string; sub: string; days: number; amount: number }

const toLatin1 = (s: string) => s.replace(/[–—]/g, '-').replace(/[^\x00-\xFF]/g, '')

// Pull every due/upcoming item for one landlord (service-role client required).
export async function gatherItems(svc: any, userId: string): Promise<Item[]> {
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - startOfToday.getTime()) / 86400000)
  const todayStr = startOfToday.toISOString().slice(0, 10)

  const [pay, lea, mai, props, assets, ents, sched] = await Promise.all([
    svc.from('payments').select('amount_due, due_date, status, tenants(full_name)').eq('user_id', userId).in('status', ['due', 'upcoming', 'late']),
    svc.from('leases').select('end_date, status, tenants(full_name), properties(address)').eq('user_id', userId).eq('status', 'executed'),
    svc.from('maintenance').select('title, priority, status, properties(address)').eq('user_id', userId).in('status', ['open', 'scheduled', 'in_progress']),
    svc.from('properties').select('id, address, insurance_expires, tax_due_date, annual_tax').eq('user_id', userId),
    svc.from('property_assets').select('name, warranty_expires, properties(address)').eq('user_id', userId),
    svc.from('entities').select('name, formation_state, annual_report_due').eq('user_id', userId),
    svc.from('maintenance_schedules').select('title, next_due, properties(address)').eq('user_id', userId).eq('active', true),
  ])

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
    if (p.insurance_expires) { const d = daysUntil(p.insurance_expires); if (d <= 30 && d >= -7) items.push({ title: 'Insurance — ' + p.address, sub: 'Renews ' + formatDate(p.insurance_expires), days: d, amount: 0 }) }
    if (p.tax_due_date) { const d = daysUntil(p.tax_due_date); if (d <= 30 && d >= -7) items.push({ title: 'Property Tax — ' + p.address, sub: 'Due ' + formatDate(p.tax_due_date) + (p.annual_tax ? ' · ' + fm(p.annual_tax) : ''), days: d, amount: p.annual_tax || 0 }) }
  })
  ;(mai.data || []).forEach((m: any) => {
    if (m.priority === 'emergency' || m.priority === 'high') items.push({ title: 'Maintenance — ' + m.title, sub: (m.properties?.address || '') + ' · ' + m.priority + ' priority', days: 0, amount: 0 })
  })
  ;(assets.data || []).forEach((a: any) => {
    if (a.warranty_expires) { const d = daysUntil(a.warranty_expires); if (d <= 30 && d >= 0) items.push({ title: 'Warranty ends — ' + a.name, sub: (a.properties?.address || '') + ' · ' + formatDate(a.warranty_expires), days: d, amount: 0 }) }
  })
  ;(ents.data || []).forEach((e: any) => {
    const due = nextAnnualReportDue(e)
    if (due) { const d = daysUntil(due); if (d <= 45 && d >= -7) items.push({ title: 'Annual Report — ' + e.name, sub: 'File by ' + formatDate(due), days: d, amount: 0 }) }
  })
  ;(sched.data || []).forEach((s: any) => {
    if (s.next_due) { const d = daysUntil(s.next_due); if (d <= 14) items.push({ title: 'Upkeep — ' + s.title, sub: (s.properties?.address || 'All properties') + ' · due ' + formatDate(s.next_due), days: d, amount: 0 }) }
  })
  return items.sort((a, b) => a.days - b.days)
}

export function digestSubject(items: Item[]) {
  const overdue = items.filter(i => i.days < 0).length
  const dueSoon = items.filter(i => i.days >= 0 && i.days <= 7).length
  return `Due Dates: ${overdue} overdue, ${dueSoon} due this week`
}

export function digestHtml(items: Item[]) {
  const overdue = items.filter(i => i.days < 0).length
  const dueSoon = items.filter(i => i.days >= 0 && i.days <= 7).length
  const atRisk = items.filter(i => i.days <= 7).reduce((s, i) => s + i.amount, 0)
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const rowHtml = (i: Item) => `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #eee">
      <div style="font-weight:600;color:#1A1A1A;font-size:14px">${i.title}</div>
      <div style="font-size:12px;color:#888;margin-top:2px">${i.sub}</div>
    </td>
    <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;font-size:12px;font-weight:700;color:${i.days < 0 ? '#DC2626' : i.days <= 7 ? '#D97706' : '#2563EB'}">
      ${i.days < 0 ? Math.abs(i.days) + 'd overdue' : i.days === 0 ? 'Today' : 'in ' + i.days + 'd'}
    </td></tr>`
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:8px">
    <div style="font-size:20px;font-weight:800;color:#2D6A4F">PropManager Pro</div>
    <div style="font-size:13px;color:#888;margin-bottom:14px">Daily Digest &middot; ${dateLabel}</div>
    <div style="font-size:14px;margin-bottom:16px">
      <b style="color:#DC2626">${overdue} overdue</b> &middot;
      <b style="color:#D97706">${dueSoon} due this week</b> &middot;
      <b style="color:#1A1A1A">${fm(atRisk)} due soon</b>
    </div>
    <table style="width:100%;border-collapse:collapse">${items.map(rowHtml).join('')}</table>
    <div style="margin-top:22px">
      <a href="${PROD_URL}/alerts" style="background:#2D6A4F;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">Open Due Dates &rarr;</a>
    </div>
  </div>`
}

export function smsText(items: Item[]) {
  const overdue = items.filter(i => i.days < 0).length
  const dueSoon = items.filter(i => i.days >= 0 && i.days <= 7).length
  const top = items[0]
  const head = `PropManager Pro: ${overdue} overdue, ${dueSoon} due this week.`
  const topLine = top ? ` Top: ${top.title}.` : ''
  return toLatin1(head + topLine + ` ${PROD_URL}/alerts`)
}

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.SENDGRID_API_KEY?.trim()
  const from = process.env.NOTIFY_FROM?.trim()
  if (!apiKey || !from || !/^SG\.[\w.\-]+$/.test(apiKey)) return { ok: false, reason: 'email_not_configured' }
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

export async function sendSMS(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token = process.env.TWILIO_AUTH_TOKEN?.trim()
  const from = process.env.TWILIO_FROM?.trim()
  if (!sid || !token || !from) return { ok: false, reason: 'sms_not_configured' }
  const params = new URLSearchParams({ To: to, From: from, Body: body })
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(sid + ':' + token).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  return res.ok ? { ok: true } : { ok: false, code: res.status, detail: await res.text() }
}

// Build + send for one landlord, honoring their channel prefs. `user` should
// include notify_email / notify_sms / notify_phone (defaults: email on, sms off).
export async function notifyLandlord(svc: any, user: any) {
  const items = await gatherItems(svc, user.id)
  if (items.length === 0) return { to: user.email, status: 'skipped_empty' }
  const out: any = { to: user.email, items: items.length }
  if (user.notify_email !== false && user.email) {
    const r = await sendEmail(user.email, digestSubject(items), digestHtml(items))
    out.email = r.ok ? 'sent' : (r.reason || ('failed_' + (r.code || '')))
  } else out.email = 'off'
  if (user.notify_sms && user.notify_phone) {
    const r = await sendSMS(user.notify_phone, smsText(items))
    out.sms = r.ok ? 'sent' : (r.reason || ('failed_' + (r.code || '')))
  } else out.sms = 'off'
  return out
}
