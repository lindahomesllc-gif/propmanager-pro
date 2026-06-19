import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = 'https://sugfedlfmvmbcnblhnuc.supabase.co'

// Public read for the client share board. Uses the service-role key (bypasses
// RLS) but only ever returns a single project that the caller already holds a
// secret share_token for, and only when sharing is enabled.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const svc = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  const { data: project } = await svc.from('design_projects').select('*').eq('share_token', token).maybeSingle()
  if (!project || !project.share_enabled) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const [{ data: rooms }, { data: items }, { data: approvals }] = await Promise.all([
    svc.from('design_rooms').select('id, name, feel, sort_order, created_at').eq('project_id', project.id).order('sort_order').order('created_at'),
    svc.from('design_items').select('id, room_id, kind, category, name, brand, color_hex, material, dimensions, image_url, status, notes, sort_order, created_at').eq('project_id', project.id).order('sort_order').order('created_at'),
    svc.from('design_approvals').select('id, item_id, decision, comment, client_name, created_at').eq('project_id', project.id).order('created_at', { ascending: false }),
  ])

  // Budget total — only if the owner opted to show it to the client.
  let budget: any = null
  if (project.share_budget) {
    const { data: priced } = await svc.from('design_items').select('price, qty, sqft, actual_cost').eq('project_id', project.id).eq('kind', 'finish')
    const allIn = (priced || []).reduce((s: number, f: any) => {
      if (f.actual_cost != null) return s + (Number(f.actual_cost) || 0)
      const base = (Number(f.sqft) || 0) > 0 ? Number(f.sqft) : (f.qty == null ? 1 : Number(f.qty) || 0)
      return s + (Number(f.price) || 0) * base
    }, 0)
    budget = { allIn, budget_total: project.budget_total != null ? Number(project.budget_total) : null }
  }

  // Only expose what the client needs (no per-item price, no internal user_id, no emails).
  return NextResponse.json({
    project: { name: project.name, client_name: project.client_name, address: project.address, style_summary: project.style_summary, cover_image_url: project.cover_image_url },
    rooms: rooms || [],
    items: items || [],
    approvals: approvals || [],
    budget,
  })
}
