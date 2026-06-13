import { NextResponse } from 'next/server'
import { svc, getUserFromRequest } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Read / save the calling landlord's notification preferences (service role).
export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data } = await svc.from('users').select('*').eq('id', user.id).single()
  return NextResponse.json({
    notify_email: data?.notify_email ?? true,
    notify_sms: data?.notify_sms ?? false,
    notify_phone: data?.notify_phone ?? '',
    email: data?.email ?? user.email ?? '',
  })
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const b = await request.json().catch(() => ({}))
    const { error } = await svc.from('users').update({
      notify_email: !!b.notify_email,
      notify_sms: !!b.notify_sms,
      notify_phone: b.notify_phone ? String(b.notify_phone).trim() : null,
    }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
