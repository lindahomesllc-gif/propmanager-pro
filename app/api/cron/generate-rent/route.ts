import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = 'https://sugfedlfmvmbcnblhnuc.supabase.co'

// Generates the current month's rent payment for every active lease that doesn't
// already have one. Idempotent (re-running creates nothing new). Runs daily via
// Vercel Cron. Add ?dryRun=1 to preview what it WOULD create without inserting.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ status: 'setup_required', message: 'Set CRON_SECRET.' }, { status: 503 })
  const url = new URL(request.url)
  const auth = request.headers.get('authorization')
  if (auth !== 'Bearer ' + secret && url.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) return NextResponse.json({ status: 'setup_required', message: 'Set SUPABASE_SERVICE_ROLE_KEY.' }, { status: 503 })

  const dryRun = url.searchParams.get('dryRun') === '1'
  const backfill = url.searchParams.get('backfill') === '1'
  const svc = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth() + 1
  const pad = (n: number) => String(n).padStart(2, '0')
  const monthPrefix = `${y}-${pad(m)}`
  const nextMonthFirst = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`
  const dim = new Date(y, m, 0).getDate()
  const todayStr = today.toISOString().split('T')[0]

  // Active leases + the payments already present for this month.
  const [{ data: leases }, { data: existing }] = await Promise.all([
    svc.from('leases').select('id, user_id, tenant_id, property_id, rent_amount, due_day, start_date, end_date').eq('status', 'executed'),
    svc.from('payments').select('lease_id').gte('due_date', monthPrefix + '-01').lt('due_date', nextMonthFirst),
  ])
  const haveThisMonth = new Set((existing || []).map((p: any) => p.lease_id).filter(Boolean))

  const toInsert: any[] = []
  for (const l of leases || []) {
    if (!l.due_day || !l.rent_amount) continue
    if (l.end_date && l.end_date < monthPrefix + '-01') continue   // lease already ended
    if (l.start_date && l.start_date >= nextMonthFirst) continue   // lease hasn't started yet (e.g. a future renewal term)
    if (haveThisMonth.has(l.id)) continue                          // already has this month's rent
    const dueDate = `${monthPrefix}-${pad(Math.min(l.due_day, dim))}`
    toInsert.push({
      user_id: l.user_id,
      tenant_id: l.tenant_id,
      property_id: l.property_id,
      lease_id: l.id,
      amount_due: l.rent_amount,
      due_date: dueDate,
      status: dueDate <= todayStr ? 'due' : 'upcoming',
    })
  }

  // --- Recurring fixed carrying costs: HOA + 1/12 of property tax & insurance.
  // One expense per property per category per month (idempotent). Taxes & insurance
  // are stored annually, so we book 1/12 each month so NOI reflects them evenly. ---
  const yearStart = `${y}-01-01`, yearEnd = `${y + 1}-01-01`
  const [{ data: recProps }, { data: yearRec }] = await Promise.all([
    svc.from('properties').select('id, user_id, hoa, hoa_fee, hoa_name, annual_tax, insurance_premium, insurance_company'),
    svc.from('expenses').select('property_id, category, description, expense_date').in('category', ['hoa', 'property_tax', 'insurance']).gte('expense_date', yearStart).lt('expense_date', yearEnd),
  ])
  // Guardrails against double-counting: skip a category for the whole year if a MANUAL
  // (non-auto) expense of it exists (you're recording the bill yourself), and never
  // duplicate a month that already has its auto entry. With ?backfill=1 we book every
  // missing month from Jan 1 through the current month (so YTD NOI reflects the full
  // accrued tax/insurance even if the cron started mid-year); normally just this month.
  const manualOverride = new Set<string>()        // property:category handled manually this year
  const presentMonth = new Set<string>()          // property:category:YYYY-MM already present
  ;(yearRec || []).forEach((e: any) => {
    if (!(e.description || '').includes('(auto)')) manualOverride.add(e.property_id + ':' + e.category)
    presentMonth.add(e.property_id + ':' + e.category + ':' + (e.expense_date || '').slice(0, 7))
  })
  const months = backfill ? Array.from({ length: m }, (_, i) => `${y}-${pad(i + 1)}`) : [monthPrefix]
  const round2 = (n: number) => Math.round(n * 100) / 100
  const hoaInsert: any[] = []
  for (const p of recProps || []) {
    for (const mp of months) {
      const base = { user_id: p.user_id, property_id: p.id, expense_date: mp + '-01', is_deductible: true }
      const can = (cat: string) => !manualOverride.has(p.id + ':' + cat) && !presentMonth.has(p.id + ':' + cat + ':' + mp)
      if (p.hoa && (p.hoa_fee || 0) > 0 && can('hoa')) hoaInsert.push({ ...base, category: 'hoa', amount: p.hoa_fee, vendor_name: p.hoa_name || null, description: 'HOA dues (auto)' })
      if ((p.annual_tax || 0) > 0 && can('property_tax')) hoaInsert.push({ ...base, category: 'property_tax', amount: round2(p.annual_tax / 12), description: 'Property tax 1/12 (auto)' })
      if ((p.insurance_premium || 0) > 0 && can('insurance')) hoaInsert.push({ ...base, category: 'insurance', amount: round2(p.insurance_premium / 12), vendor_name: p.insurance_company || null, description: 'Insurance 1/12 (auto)' })
    }
  }

  // Overdue unpaid charges past their grace period become 'late' (so the badge,
  // dashboard stat, and alerts reflect reality), and a late fee is applied once
  // if the lease has one configured. Grace period + fee come from the lease.
  // Only status 'due' rows are processed; once flipped to 'late' they're skipped
  // next run, so the fee is naturally applied exactly once (no extra column needed).
  const { data: overdueRows } = await svc.from('payments')
    .select('id, amount_due, due_date, notes, leases(late_fee_amount, late_fee_type, grace_period_days)')
    .eq('status', 'due').lt('due_date', todayStr)

  const todayMs = new Date(todayStr + 'T00:00:00').getTime()
  const lateNow = (overdueRows || []).filter((p: any) => {
    const grace = p.leases?.grace_period_days || 0
    const graceEnd = new Date(p.due_date + 'T00:00:00'); graceEnd.setDate(graceEnd.getDate() + grace)
    return todayMs > graceEnd.getTime()
  })
  const feeFor = (p: any) => {
    const amt = p.leases?.late_fee_amount || 0
    if (amt <= 0) return 0
    return p.leases?.late_fee_type === 'percent'
      ? Math.round((p.amount_due || 0) * amt) / 100
      : amt
  }

  if (dryRun) {
    return NextResponse.json({ status: 'dry_run', month: monthPrefix, backfill, monthsCovered: months, activeLeases: (leases || []).length, wouldCreate: toInsert.length, wouldCreateRecurring: hoaInsert.length, recurringPreview: hoaInsert, wouldMarkLate: lateNow.length, wouldApplyFees: lateNow.filter(p => feeFor(p) > 0).length, preview: toInsert })
  }

  let created = 0
  if (toInsert.length) {
    const { data, error } = await svc.from('payments').insert(toInsert).select('id')
    if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
    created = data?.length || 0
  }

  let recurringCreated = 0
  if (hoaInsert.length) {
    const { data, error } = await svc.from('expenses').insert(hoaInsert).select('id')
    if (!error) recurringCreated = data?.length || 0
  }

  let markedLate = 0, feesApplied = 0
  for (const p of lateNow) {
    const fee = feeFor(p)
    const update: any = { status: 'late' }
    if (fee > 0) {
      update.amount_due = (p.amount_due || 0) + fee
      update.notes = (p.notes ? p.notes + ' · ' : '') + 'Late fee $' + fee + ' applied'
    }
    const { error: uErr } = await svc.from('payments').update(update).eq('id', p.id)
    if (!uErr) { markedLate++; if (fee > 0) feesApplied++ }
  }

  return NextResponse.json({ status: 'done', month: monthPrefix, backfill, monthsCovered: months.length, activeLeases: (leases || []).length, created, recurringCreated, markedLate, feesApplied })
}
