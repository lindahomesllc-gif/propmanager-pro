import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
const SUPABASE_URL = 'https://sugfedlfmvmbcnblhnuc.supabase.co'
const BUCKET = 'lease-documents'

// A tenant can't sign files in the landlord's storage folder directly, so the portal
// asks this route for a short-lived signed URL. We verify (service-role) that the file
// actually belongs to one of the tenant's own leases or their property's reports first.
function pathOf(u: string): string {
  const marker = '/' + BUCKET + '/'
  const i = u.indexOf(marker)
  return i !== -1 ? decodeURIComponent(u.slice(i + marker.length).split('?')[0]) : u.replace(/^\/+/, '')
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const path = pathOf(new URL(request.url).searchParams.get('u') || '')
  if (!path) return NextResponse.json({ error: 'bad_path' }, { status: 400 })

  const svc = createClient(SUPABASE_URL, key, { auth: { persistSession: false } })
  const { data: t } = await svc.from('tenants').select('id, property_id').eq('email', user.email).eq('status', 'active').single()
  if (!t) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const [{ data: leases }, { data: reports }] = await Promise.all([
    svc.from('leases').select('pdf_url').eq('tenant_id', t.id),
    svc.from('condition_reports').select('pdf_url').eq('property_id', t.property_id),
  ])
  const owns = [...(leases || []), ...(reports || [])].some((r: any) => r.pdf_url && pathOf(r.pdf_url) === path)
  if (!owns) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await svc.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data) return NextResponse.json({ error: error?.message || 'sign_failed' }, { status: 502 })
  return NextResponse.json({ url: data.signedUrl })
}
