import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = 'https://sugfedlfmvmbcnblhnuc.supabase.co'
const DECISIONS = ['approved', 'rejected', 'comment']

// Public write for the client share board. Records a client's approve / reject /
// comment against one finish, and mirrors it into the owner's activity log.
export async function POST(request: Request) {
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const { token, item_id, decision, comment, client_name } = body || {}

  if (!token || !item_id || !DECISIONS.includes(decision)) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  if (decision === 'comment' && !String(comment || '').trim()) return NextResponse.json({ error: 'comment_required' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const svc = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  const { data: project } = await svc.from('design_projects').select('id, user_id, share_enabled').eq('share_token', token).maybeSingle()
  if (!project || !project.share_enabled) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // The item must belong to this project (don't let a token touch other data).
  const { data: item } = await svc.from('design_items').select('id, name').eq('id', item_id).eq('project_id', project.id).maybeSingle()
  if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const name = String(client_name || '').trim().slice(0, 80) || 'Client'
  const note = String(comment || '').trim().slice(0, 1000) || null

  const { error: insErr } = await svc.from('design_approvals').insert({
    user_id: project.user_id, project_id: project.id, item_id,
    decision, comment: note, client_name: name,
  })
  if (insErr) return NextResponse.json({ error: 'insert_failed' }, { status: 500 })

  const verb = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'requested a change to' : 'commented on'
  await svc.from('design_activity').insert({
    user_id: project.user_id, project_id: project.id, item_id, kind: 'approval', author: name,
    text: name + ' ' + verb + ' “' + item.name + '”' + (note ? ': ' + note : ''),
  })

  return NextResponse.json({ ok: true })
}
