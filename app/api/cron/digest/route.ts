import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyLandlord } from '@/lib/notify'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = 'https://sugfedlfmvmbcnblhnuc.supabase.co'

// Multi-tenant daily digest. Runs via Vercel Cron (see vercel.json). Uses the
// service-role key to read every landlord's data (bypassing RLS), then sends each
// landlord their own digest by email (SendGrid) and/or SMS (Twilio) per their prefs.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ status: 'setup_required', message: 'Set CRON_SECRET in Vercel.' }, { status: 503 })
  const url = new URL(request.url)
  const auth = request.headers.get('authorization')
  if (auth !== 'Bearer ' + secret && url.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) return NextResponse.json({ status: 'setup_required', message: 'Set SUPABASE_SERVICE_ROLE_KEY in Vercel.' }, { status: 503 })
  const svc = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  // select('*') so the cron keeps working even before the notify_* columns exist
  const { data: landlords, error: lErr } = await svc.from('users').select('*')
  if (lErr) return NextResponse.json({ status: 'error', message: lErr.message }, { status: 500 })

  const results: any[] = []
  for (const u of (landlords || [])) {
    if (!u.email) continue
    try { results.push(await notifyLandlord(svc, u)) }
    catch (e: any) { results.push({ to: u.email, status: 'error', message: String(e?.message || e) }) }
  }

  return NextResponse.json({
    status: 'done',
    landlords: (landlords || []).length,
    emailed: results.filter(r => r.email === 'sent').length,
    texted: results.filter(r => r.sms === 'sent').length,
    results,
  })
}
