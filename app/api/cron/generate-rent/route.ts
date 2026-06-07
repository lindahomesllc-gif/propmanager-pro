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
    svc.from('leases').select('id, user_id, tenant_id, property_id, rent_amount, due_day, end_date').eq('status', 'executed'),
    svc.from('payments').select('lease_id').gte('due_date', monthPrefix + '-01').lt('due_date', nextMonthFirst),
  ])
  const haveThisMonth = new Set((existing || []).map((p: any) => p.lease_id).filter(Boolean))

  const toInsert: any[] = []
  for (const l of leases || []) {
    if (!l.due_day || !l.rent_amount) continue
    if (l.end_date && l.end_date < monthPrefix + '-01') continue // lease already ended
    if (haveThisMonth.has(l.id)) continue                         // already has this month's rent
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

  if (dryRun) {
    return NextResponse.json({ status: 'dry_run', month: monthPrefix, activeLeases: (leases || []).length, wouldCreate: toInsert.length, preview: toInsert })
  }

  let created = 0
  if (toInsert.length) {
    const { data, error } = await svc.from('payments').insert(toInsert).select('id')
    if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
    created = data?.length || 0
  }
  return NextResponse.json({ status: 'done', month: monthPrefix, activeLeases: (leases || []).length, created })
}
