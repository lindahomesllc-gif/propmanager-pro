import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// AI design assistant — uses the project's brief/concept/palette/selections to
// suggest pairings, cohesion notes, and what to source next. Owner-authenticated
// (RLS-scoped). Requires ANTHROPIC_API_KEY in the environment.
export async function POST(request: Request) {
  const { user, db } = await getAuth(request)
  if (!user || !db) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) return NextResponse.json({ error: 'no_key' }, { status: 503 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const projectId = body?.projectId
  if (!projectId) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const { data: project } = await db.from('design_projects').select('*').eq('id', projectId).maybeSingle()
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const { data: rooms } = await db.from('design_rooms').select('name, area').eq('project_id', projectId)
  const { data: items } = await db.from('design_items').select('kind, category, name, brand, material, color_hex').eq('project_id', projectId)
  const finishes = (items || []).filter((i: any) => i.kind === 'finish')
  const colors = (items || []).filter((i: any) => i.kind === 'color' && i.color_hex).map((i: any) => i.color_hex)
  const c = project.concept || {}, b = project.brief || {}

  const lines: string[] = []
  lines.push('You are an expert interior designer helping a colleague keep a project cohesive. Be specific, practical and concise. Ground every suggestion in their stated concept and selections. Suggest types, finishes, colors (with real paint names where helpful) and pairings — do not invent specific SKUs.')
  lines.push('PROJECT: ' + (project.name || '') + (project.style_summary ? ' — ' + project.style_summary : ''))
  if (c.moodWords) lines.push('Mood words: ' + c.moodWords)
  if (c.story) lines.push('Concept: ' + c.story)
  if (c.dos) lines.push('Say yes to: ' + c.dos)
  if (c.avoids) lines.push('Avoid: ' + c.avoids)
  if (b.mustKeeps) lines.push('Must keep: ' + b.mustKeeps)
  if (b.dislikes) lines.push('Client dislikes: ' + b.dislikes)
  if (colors.length) lines.push('Palette (hex): ' + colors.join(', '))
  if (rooms?.length) lines.push('Rooms: ' + rooms.map((r: any) => r.name).join(', '))
  if (finishes.length) lines.push('Selected finishes: ' + finishes.map((f: any) => f.name + (f.brand ? ' (' + f.brand + ')' : '') + (f.material ? ' — ' + f.material : '')).join('; '))
  lines.push('\nReturn, in plain text with short headers/bullets and under ~260 words:\n1) Cohesion — 2-3 observations or risks (e.g. mixed metals, palette drift).\n2) Pairings — specific complementary suggestions (paint colors, metal finish, lighting style, textiles) that fit the concept.\n3) Source next — the most important gaps to select.')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 800, messages: [{ role: 'user', content: lines.join('\n') }] }),
    })
    if (!res.ok) return NextResponse.json({ error: 'ai_failed' }, { status: 502 })
    const data = await res.json()
    const text = (data.content || []).map((p: any) => p.text || '').join('').trim()
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 })
  }
}
