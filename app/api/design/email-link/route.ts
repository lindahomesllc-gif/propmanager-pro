import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Email the client their private design-board share link. Landlord-authenticated
// (RLS ensures they can only email a link to their own project). Sends via SendGrid.
export async function POST(request: Request) {
  const { user, db } = await getAuth(request)
  if (!user || !db) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const projectId = body?.projectId
  if (!projectId) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const { data: project } = await db.from('design_projects').select('*').eq('id', projectId).maybeSingle()
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!project.share_enabled) return NextResponse.json({ error: 'sharing_off' }, { status: 400 })

  const to = (body?.email || project.client_email || '').trim()
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return NextResponse.json({ error: 'no_email' }, { status: 400 })

  const apiKey = process.env.SENDGRID_API_KEY?.trim()
  const from = process.env.NOTIFY_FROM?.trim()
  if (!apiKey || !from || !/^SG\.[\w.\-]+$/.test(apiKey)) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  const origin = new URL(request.url).origin
  const link = origin + '/share/' + project.share_token
  const sender = user.user_metadata?.full_name || 'Your designer'
  const client = (project.client_name || '').trim()
  const projName = project.name || 'your project'

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:8px">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#2D6A4F">Design Board</div>
    <div style="font-size:22px;font-weight:800;color:#1A1A1A;margin:6px 0 14px">${projName}</div>
    <div style="font-size:15px;color:#333;line-height:1.6">${client ? 'Hi ' + client + ',' : 'Hi,'}<br/><br/>
    ${sender} has shared a design board with you. You can browse the moodboard and finishes, and <b>approve, request changes, or comment</b> on each selection — no login needed.</div>
    <div style="margin:22px 0">
      <a href="${link}" style="background:#2D6A4F;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700">Open the design board &rarr;</a>
    </div>
    <div style="font-size:12px;color:#888;line-height:1.5">Or paste this link into your browser:<br/><a href="${link}" style="color:#2D6A4F">${link}</a></div>
  </div>`

  const toLatin1 = (s: string) => s.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x00-\xFF]/g, '')
  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from, name: toLatin1(sender) },
    subject: toLatin1('Your design board — ' + projName),
    content: [{ type: 'text/html', value: toLatin1(html) }],
  })
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: new TextEncoder().encode(payload),
  })
  if (!res.ok) return NextResponse.json({ error: 'send_failed', detail: await res.text() }, { status: 502 })

  await db.from('design_activity').insert({ project_id: projectId, kind: 'note', text: 'Emailed the design-board link to ' + to, author: 'you' })
  return NextResponse.json({ ok: true, to })
}
