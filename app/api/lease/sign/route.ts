import { NextResponse } from 'next/server'
import { svc, getUserFromRequest } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Tenant e-signs their lease from the portal. Verifies the caller's email matches
// the lease's tenant, then records the signature server-side (service role).
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const { leaseId, name } = await request.json().catch(() => ({}))
    if (!leaseId || !name || !String(name).trim()) return NextResponse.json({ error: 'missing params' }, { status: 400 })

    const { data: lease } = await svc.from('leases').select('id, status, tenant_signed_at, tenants(email)').eq('id', leaseId).single()
    if (!lease) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if ((lease as any).tenants?.email?.toLowerCase() !== (user.email || '').toLowerCase())
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (lease.tenant_signed_at) return NextResponse.json({ ok: true, alreadySigned: true })

    const signedAt = new Date().toISOString()
    const nextStatus = ['draft', 'sent'].includes(lease.status) ? 'tenant_signed' : lease.status
    const { error } = await svc.from('leases').update({
      tenant_signed_at: signedAt,
      tenant_signed_name: String(name).trim(),
      status: nextStatus,
    }).eq('id', leaseId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, signedAt })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
