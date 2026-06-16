import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Area market averages from RentCast (avg sale price + avg rent for a zip).
// Authed so it can't be abused to burn the RentCast quota. Key stays server-side.
export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const key = process.env.RENTCAST_API_KEY?.trim()
  if (!key) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const zip = new URL(request.url).searchParams.get('zip')?.trim() || ''
  if (!/^\d{5}$/.test(zip)) return NextResponse.json({ error: 'Enter a 5-digit zip code.' }, { status: 400 })
  try {
    const res = await fetch(`https://api.rentcast.io/v1/markets?zipCode=${zip}&dataType=All`, { headers: { 'X-Api-Key': key, Accept: 'application/json' } })
    if (!res.ok) return NextResponse.json({ error: 'RentCast error ' + res.status, detail: (await res.text()).slice(0, 300) }, { status: 502 })
    const d: any = await res.json()
    const price = d?.saleData?.averagePrice ?? d?.saleData?.medianPrice ?? null
    const rent = d?.rentalData?.averageRent ?? d?.rentalData?.medianRent ?? null
    return NextResponse.json({ zip, price, rent, city: d?.city ?? null, state: d?.state ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
