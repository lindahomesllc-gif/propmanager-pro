'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate } from '@/lib/supabase'

// CapEx Replacement Planner — forecasts big-ticket replacements from the appliances/
// systems registry (install date + typical lifespan) and recommends a monthly reserve.

// keyword → [typical lifespan years, typical replacement cost]. First match wins.
const KW: [string, number, number][] = [
  ['roof', 25, 12000], ['water heater', 10, 1600], ['furnace', 18, 4500], ['heat pump', 15, 6000],
  ['air condition', 15, 6000], ['hvac', 15, 7000], ['a/c', 15, 6000], ['condenser', 15, 5000],
  ['refrigerator', 13, 1500], ['fridge', 13, 1500], ['dishwasher', 10, 800], ['washer', 11, 900],
  ['dryer', 13, 900], ['range', 15, 1100], ['stove', 15, 1100], ['oven', 15, 1100], ['cooktop', 15, 900],
  ['microwave', 9, 400], ['disposal', 12, 250], ['water softener', 15, 1200], ['garage door', 15, 1500],
  ['gutter', 20, 1500], ['fence', 18, 4000], ['deck', 15, 4000], ['paint', 8, 5000],
]
const CAT_LIFE: Record<string, number> = { roof: 25, hvac: 15, water_heater: 10, appliance: 12, system: 20, other: 15 }
const CAT_COST: Record<string, number> = { roof: 12000, hvac: 7000, water_heater: 1500, appliance: 1200, system: 3000, other: 2000 }
function spec(a: any) {
  const hay = ((a.name || '') + ' ' + (a.category || '')).toLowerCase()
  for (const [kw, life, cost] of KW) if (hay.includes(kw)) return { life, cost }
  return { life: CAT_LIFE[a.category] || 15, cost: CAT_COST[a.category] || 2000 }
}
const YR = 365.25 * 86400000

export default function CapexPage() {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('property_assets').select('*, properties(address)').then(({ data }) => {
      setAssets(data || [])
      setLoading(false)
    })
  }, [])

  const now = new Date()
  const rows = assets.map(a => {
    const s = spec(a)
    const cost = a.cost && a.cost > 0 ? a.cost : s.cost
    const annual = cost / s.life
    let installDate: Date | null = null, replaceDate: Date | null = null, yearsLeft: number | null = null, ageYears: number | null = null
    if (a.install_date) {
      installDate = new Date(a.install_date + 'T00:00:00')
      replaceDate = new Date(installDate); replaceDate.setFullYear(installDate.getFullYear() + s.life)
      yearsLeft = (replaceDate.getTime() - now.getTime()) / YR
      ageYears = (now.getTime() - installDate.getTime()) / YR
    }
    return { ...a, _life: s.life, _cost: cost, _annual: annual, installDate, replaceDate, yearsLeft, ageYears }
  })

  const monthlyReserve = rows.reduce((s, r) => s + r._annual, 0) / 12
  const annualReserve = monthlyReserve * 12
  const trackedValue = rows.reduce((s, r) => s + r._cost, 0)
  const dated = rows.filter(r => r.replaceDate).sort((a, b) => a.replaceDate!.getTime() - b.replaceDate!.getTime())
  const undated = rows.filter(r => !r.replaceDate)
  const dueIn5 = dated.filter(r => (r.yearsLeft as number) <= 5)
  const dueIn5Cost = dueIn5.reduce((s, r) => s + r._cost, 0)

  const statusOf = (yl: number) => yl < 0 ? { c: 'chip-r', l: 'Overdue' } : yl <= 2 ? { c: 'chip-a', l: 'Due soon' } : yl <= 5 ? { c: 'chip-b', l: 'Within 5 yrs' } : { c: 'chip-g', l: 'On track' }

  const tile = (label: string, value: string, sub: string, color = 'var(--text)') => (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color, marginTop: '5px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{sub}</div>
    </div>
  )
  const panel = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }
  const secLabel = { fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🔮 Replacement Planner</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => window.print()} className='btn btn-ghost no-print'>🖨 PDF</button>
          <a href='/properties' className='btn btn-ghost no-print'>Manage appliances →</a>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', maxWidth: '680px' }}>
          Forecasts big-ticket replacements from the install dates in your <strong>Appliances &amp; Systems</strong> registry, using typical lifespans. The reserve is what to set aside monthly so the money&apos;s there when each item wears out.
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: '14px' }}><div className='skeleton' style={{ height: '80px' }} /><div className='skeleton' style={{ height: '240px' }} /></div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔮</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '8px' }}>Nothing to forecast yet</div>
            <div style={{ fontSize: '13px', marginBottom: '16px', maxWidth: '420px', margin: '0 auto 16px' }}>Log your A/C units, water heaters, roof and appliances (with install dates) on each property&apos;s <strong>Appliances &amp; Systems</strong> tab — the forecast builds itself from there.</div>
            <a href='/properties' className='btn btn-primary'>Go to Properties</a>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px', marginBottom: '22px' }}>
              {tile('Recommended Reserve', fm(monthlyReserve) + '/mo', fm(annualReserve) + '/yr set-aside', 'var(--green)')}
              {tile('Coming Due (5 yrs)', fm(dueIn5Cost), dueIn5.length + ' item' + (dueIn5.length === 1 ? '' : 's'), dueIn5.length ? 'var(--amber)' : 'var(--text)')}
              {tile('Tracked Items', String(rows.length), undated.length ? undated.length + ' need install date' : 'all dated', 'var(--text)')}
              {tile('Replacement Value', fm(trackedValue), 'to eventually replace', 'var(--text)')}
            </div>

            <div style={secLabel}>Forecast — soonest first</div>
            <div style={{ ...panel, marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr 70px 90px 100px 110px', gap: '10px', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)' }}>
                <div>Item</div><div>Property</div><div>Age</div><div>Replace ~</div><div style={{ textAlign: 'right' }}>Est. Cost</div><div style={{ textAlign: 'right' }}>Status</div>
              </div>
              {dated.map(r => {
                const st = statusOf(r.yearsLeft as number)
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr 70px 90px 100px 110px', gap: '10px', padding: '11px 16px', borderBottom: '0.5px solid var(--border)', alignItems: 'center', fontSize: '13px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Installed {formatDate(r.install_date)} · {r._life}yr life</div>
                    </div>
                    <a href={'/properties/' + r.property_id + '?tab=appliances'} style={{ fontSize: '12px', color: 'var(--text2)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.properties?.address || '—'}</a>
                    <div style={{ color: 'var(--text2)' }}>{Math.round(r.ageYears as number)}y</div>
                    <div style={{ color: 'var(--text2)', fontWeight: 600 }}>{r.replaceDate!.getFullYear()}</div>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{fm(r._cost)}</div>
                    <div style={{ textAlign: 'right' }}><span className={'chip ' + st.c}>{st.l}</span></div>
                  </div>
                )
              })}
            </div>

            {undated.length > 0 && (
              <>
                <div style={secLabel}>Add an install date to forecast these</div>
                <div style={{ ...panel, marginBottom: '20px' }}>
                  {undated.map(r => (
                    <a key={r.id} href={'/properties/' + r.property_id + '?tab=appliances'} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                        <div style={{ color: 'var(--text)', fontWeight: 600 }}>{r.name} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>· {r.properties?.address || '—'}</span></div>
                        <span style={{ fontSize: '12px', color: 'var(--green)' }}>Add date →</span>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6, maxWidth: '680px' }}>
              <strong>How this is figured:</strong> each item&apos;s replacement year = install date + a typical lifespan for that type (e.g. water heater ~10 yrs, HVAC ~15, roof ~25). Estimated cost uses the price you recorded, or a typical figure if you left it blank. The monthly reserve is the sum of each item&apos;s (cost ÷ lifespan), spread evenly — fund this and big repairs won&apos;t blindside your cash flow. These are planning estimates, not quotes.
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
