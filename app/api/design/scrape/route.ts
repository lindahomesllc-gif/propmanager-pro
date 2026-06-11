import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

// Lightweight "clipper": fetch a product page server-side and extract the
// image, title, price, and brand from Open Graph / JSON-LD / meta tags.
// No external deps — regex over the HTML head. Returns only parsed fields
// (never the raw page) so it can't be used as a general content proxy.

// SSRF guard: refuse anything that isn't a public http(s) host.
function isPublicUrl(raw: string): URL | null {
  let u: URL
  try { u = new URL(raw) } catch { return null }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  const h = u.hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return null
  // block obvious private / link-local / loopback IPv4 + the cloud metadata IP
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return null
  if (h === '169.254.169.254' || h.startsWith('[')) return null
  return u
}

function decode(s: string): string {
  return (s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .trim()
}

// Read a meta tag's content regardless of attribute order (property=... content=... or reverse).
function meta(html: string, key: string): string | null {
  const k = key.replace(/[:]/g, '\\:')
  const pats = [
    new RegExp('<meta[^>]+(?:property|name)=["\\\']' + k + '["\\\'][^>]*?content=["\\\']([^"\\\']+)["\\\']', 'i'),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]*?(?:property|name)=["\\\']' + k + '["\\\']', 'i'),
  ]
  for (const p of pats) { const m = html.match(p); if (m) return decode(m[1]) }
  return null
}

function fromJsonLd(html: string): { name?: string; image?: string; price?: number; brand?: string } {
  const out: any = {}
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
  for (const b of blocks) {
    const json = b.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
    let data: any
    try { data = JSON.parse(json) } catch { continue }
    const nodes = Array.isArray(data) ? data : (data['@graph'] && Array.isArray(data['@graph']) ? data['@graph'] : [data])
    for (const n of nodes) {
      const t = n && (Array.isArray(n['@type']) ? n['@type'].join(',') : n['@type'])
      if (!t || !/product/i.test(String(t))) continue
      if (n.name && !out.name) out.name = decode(String(n.name))
      const img = Array.isArray(n.image) ? n.image[0] : (n.image && n.image.url ? n.image.url : n.image)
      if (img && !out.image) out.image = String(img)
      if (n.brand && !out.brand) out.brand = decode(String(n.brand.name || n.brand))
      const offers = Array.isArray(n.offers) ? n.offers[0] : n.offers
      const price = offers && (offers.price || offers.lowPrice || (offers.priceSpecification && offers.priceSpecification.price))
      if (price && out.price == null) { const p = parseFloat(String(price).replace(/[^0-9.]/g, '')); if (!isNaN(p)) out.price = p }
    }
  }
  return out
}

export async function POST(request: Request) {
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const u = isPublicUrl(String(body?.url || '').trim())
  if (!u) return NextResponse.json({ error: 'invalid_url' }, { status: 400 })

  let html = ''
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    const res = await fetch(u.toString(), {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PropManagerBot/1.0)', 'Accept': 'text/html' },
    })
    clearTimeout(timer)
    if (!res.ok) return NextResponse.json({ error: 'fetch_failed', status: res.status }, { status: 502 })
    if (!/text\/html/i.test(res.headers.get('content-type') || '')) return NextResponse.json({ error: 'not_html' }, { status: 415 })
    // cap how much we read (head is all we need)
    const buf = await res.arrayBuffer()
    html = new TextDecoder('utf-8').decode(buf.slice(0, 1_500_000))
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 })
  }

  const ld = fromJsonLd(html)
  const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || ''
  let priceStr = meta(html, 'og:price:amount') || meta(html, 'product:price:amount') || null
  let price = ld.price
  if (price == null && priceStr) { const p = parseFloat(priceStr.replace(/[^0-9.]/g, '')); if (!isNaN(p)) price = p }

  const result = {
    name: ld.name || meta(html, 'og:title') || meta(html, 'twitter:title') || decode(titleTag) || null,
    image: ld.image || meta(html, 'og:image') || meta(html, 'twitter:image') || null,
    price: price ?? null,
    brand: ld.brand || meta(html, 'og:site_name') || null,
    site: u.hostname.replace(/^www\./, ''),
    source_url: u.toString(),
  }
  return NextResponse.json(result)
}
