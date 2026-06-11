import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

// Fetch a remote image (by URL) server-side and return it as a data URL the
// client can upload to storage. SSRF-guarded; images only; size-capped.
function isPublicUrl(raw: string): URL | null {
  let u: URL
  try { u = new URL(raw) } catch { return null }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  const h = u.hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return null
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return null
  if (h === '169.254.169.254' || h.startsWith('[')) return null
  return u
}

export async function POST(request: Request) {
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const u = isPublicUrl(String(body?.url || '').trim())
  if (!u) return NextResponse.json({ error: 'invalid_url' }, { status: 400 })

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    const res = await fetch(u.toString(), { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PropManagerBot/1.0)', 'Accept': 'image/*' } })
    clearTimeout(timer)
    if (!res.ok) return NextResponse.json({ error: 'fetch_failed', status: res.status }, { status: 502 })
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim()
    if (!/^image\//i.test(ct)) return NextResponse.json({ error: 'not_image' }, { status: 415 })
    const buf = await res.arrayBuffer()
    if (buf.byteLength > 8_000_000) return NextResponse.json({ error: 'too_large' }, { status: 413 })
    const b64 = Buffer.from(buf).toString('base64')
    return NextResponse.json({ dataUrl: 'data:' + ct + ';base64,' + b64 })
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 })
  }
}
