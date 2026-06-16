'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, monthlyPI } from '@/lib/supabase'

// "Next Move" — Capital Deployment Planner. Enter the cash you'll pull (refi/sale)
// + your Buy Box (deal criteria), see what it buys now and how the portfolio
// compounds if you recycle capital (BRRRR). Planning tool, not advice.
const DEFAULT_BOX = {
  capital: '', market: '', maxPrice: '250000', downPct: '25', costPct: '5',
  rentPct: '0.8', rate: '7.5', term: '30', apprPct: '3', expenseRatio: '45',
  minCoC: '8', minDSCR: '1.25', recycle: true,
}

export default function DeployPage() {
  const [box, setBox] = useState<any>(DEFAULT_BOX)
  const [savedAt, setSavedAt] = useState(0)
  const [pullSuggest, setPullSuggest] = useState<number | null>(null)

  useEffect(() => {
    let saved: any = null
    try { saved = JSON.parse(localStorage.getItem('buyBox') || 'null') } catch {}
    if (saved) setBox({ ...DEFAULT_BOX, ...saved })
    // suggest deployable capital = idle equity on free-&-clear + low-debt props (rough)
    Promise.all([
      supabase.from('properties').select('id, market_value, purchase_price'),
      supabase.from('mortgages').select('property_id, current_balance, is_paid_off'),
    ]).then(([p, m]) => {
      const bal: Record<string, number> = {}
      ;(m.data || []).forEach((x: any) => { if (!x.is_paid_off) bal[x.property_id] = (bal[x.property_id] || 0) + (x.current_balance || 0) })
      // ~75% LTV cash-out headroom across the portfolio (very rough planning figure)
      const headroom = (p.data || []).reduce((s: number, pr: any) => {
        const v = pr.market_value || pr.purchase_price || 0
        return s + Math.max(0, v * 0.75 - (bal[pr.id] || 0))
      }, 0)
      setPullSuggest(Math.round(headroom))
    })
  }, [])

  const set = (k: string, v: any) => setBox((b: any) => ({ ...b, [k]: v }))
  function save() { try { localStorage.setItem('buyBox', JSON.stringify(box)); setSavedAt(Date.now()) } catch {} }
  const N = (k: string) => parseFloat(box[k]) || 0

  // per-deal economics
  const price = N('maxPrice')
  const cashPerDeal = price * (N('downPct') / 100) + price * (N('costPct') / 100)
  const loan = price * (1 - N('downPct') / 100)
  const piMo = monthlyPI({ original_amount: loan, interest_rate: N('rate'), term_years: N('term') })
  const rentMo = price * (N('rentPct') / 100)
  const annualRent = rentMo * 12
  const noi = annualRent * (1 - N('expenseRatio') / 100)
  const debtAnnual = piMo * 12
  const cfAnnual = noi - debtAnnual
  const coc = cashPerDeal > 0 ? cfAnnual / cashPerDeal * 100 : null
  const dscr = debtAnnual > 0 ? noi / debtAnnual : null
  const meets = (coc ?? -1) >= N('minCoC') && (dscr == null || dscr >= N('minDSCR')) && cfAnnual >= 0

  const capital = N('capital')
  const dealsNow = cashPerDeal > 0 ? Math.floor(capital / cashPerDeal) : 0
  const leftover = capital - dealsNow * cashPerDeal

  // 10-year compounding snowball
  let cap = capital, doors = 0, portCF = 0
  const snap: any[] = []
  for (let y = 1; y <= 10; y++) {
    const buy = cashPerDeal > 0 ? Math.floor(cap / cashPerDeal) : 0
    doors += buy; cap -= buy * cashPerDeal; portCF += buy * cfAnnual
    cap += portCF // reinvest cash flow
    if (box.recycle) cap += buy * cashPerDeal * 0.7 // BRRRR: recover ~70% of invested cash via refi
    if ([1, 3, 5, 10].includes(y)) snap.push({ y, doors, cf: portCF, value: doors * price })
  }

  const inp = { width: '100%', padding: '7px 9px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '3px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }
  const sec = { fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }
  const Badge = ({ ok, text }: any) => <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: ok ? 'var(--green-bg)' : 'var(--amber-bg)', color: ok ? 'var(--green)' : 'var(--amber)' }}>{text}</span>
  const row = (label: string, val: string, color = 'var(--text)', strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
      <span style={{ color: 'var(--text2)' }}>{label}</span><span style={{ color, fontWeight: strong ? 700 : 600 }}>{val}</span>
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🌱 Next Move · Deployment Planner</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => window.print()} className='btn btn-ghost no-print'>🖨 PDF</button>
          <button onClick={save} className='btn btn-primary no-print'>{Date.now() - savedAt < 2500 ? '✓ Saved' : 'Save Buy Box'}</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', maxWidth: '720px' }}>
          Turn pulled equity into your next deal. Enter the cash you&apos;ll free up (cash-out refi or sale) and your <strong>Buy Box</strong> — then see what it buys now and how the portfolio compounds if you recycle the capital. Planning estimates only — confirm with your CPA &amp; lender.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px,1fr))', gap: '16px' }}>
          {/* CAPITAL + BUY BOX */}
          <div style={card}>
            <div style={sec}>💰 Capital &amp; Buy Box</div>
            <div style={{ marginBottom: '10px' }}>
              <label style={lbl}>Cash available to deploy</label>
              <input style={inp} type='number' placeholder='from a refi cash-out or sale' value={box.capital} onChange={e => set('capital', e.target.value)} />
              {pullSuggest != null && pullSuggest > 0 && <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>Rough portfolio cash-out headroom (~75% LTV): <button onClick={() => set('capital', String(pullSuggest))} style={{ background: 'transparent', border: 'none', color: 'var(--green)', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: '10px' }}>use {fm(pullSuggest)}</button></div>}
            </div>
            <div style={{ marginBottom: '10px' }}><label style={lbl}>Target market / area</label><input style={inp} placeholder='e.g. Winter Garden, FL' value={box.market} onChange={e => set('market', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div><label style={lbl}>Target Price</label><input style={inp} type='number' value={box.maxPrice} onChange={e => set('maxPrice', e.target.value)} /></div>
              <div><label style={lbl}>Down %</label><input style={inp} type='number' value={box.downPct} onChange={e => set('downPct', e.target.value)} /></div>
              <div><label style={lbl}>Close+Rehab %</label><input style={inp} type='number' value={box.costPct} onChange={e => set('costPct', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div><label style={lbl}>Rent %/mo</label><input style={inp} type='number' step='0.05' value={box.rentPct} onChange={e => set('rentPct', e.target.value)} /></div>
              <div><label style={lbl}>Rate %</label><input style={inp} type='number' step='0.1' value={box.rate} onChange={e => set('rate', e.target.value)} /></div>
              <div><label style={lbl}>Term</label><input style={inp} type='number' value={box.term} onChange={e => set('term', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div><label style={lbl}>Expense %</label><input style={inp} type='number' value={box.expenseRatio} onChange={e => set('expenseRatio', e.target.value)} /></div>
              <div><label style={lbl}>Min CoC %</label><input style={inp} type='number' value={box.minCoC} onChange={e => set('minCoC', e.target.value)} /></div>
              <div><label style={lbl}>Min DSCR</label><input style={inp} type='number' step='0.05' value={box.minDSCR} onChange={e => set('minDSCR', e.target.value)} /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px', color: 'var(--text2)', cursor: 'pointer' }}>
              <input type='checkbox' checked={box.recycle} onChange={e => set('recycle', e.target.checked)} />
              Recycle capital (BRRRR — refi each deal to pull ~70% back out)
            </label>
          </div>

          {/* WHAT IT BUYS NOW */}
          <div style={card}>
            <div style={sec}>🎯 What your capital buys now</div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: '8px', padding: '12px' }}>
                <div style={lbl}>Doors you can buy</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, color: 'var(--green)' }}>{dealsNow}</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{fm(cashPerDeal)} cash each · {fm(leftover)} left over</div>
              </div>
              <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: '8px', padding: '12px' }}>
                <div style={lbl}>New cash flow</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, color: cfAnnual >= 0 ? 'var(--green)' : 'var(--red)' }}>{fm(dealsNow * cfAnnual / 12)}<span style={{ fontSize: '12px', color: 'var(--text3)' }}>/mo</span></div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{fm(dealsNow * cfAnnual)}/yr added</div>
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '6px 0' }}>Per-deal check vs your Buy Box</div>
            {row('Loan / Rent', fm(loan) + ' · ' + fm(rentMo) + '/mo')}
            {row('Cash flow', fm(cfAnnual) + '/yr', cfAnnual >= 0 ? 'var(--green)' : 'var(--red)')}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text2)' }}>Cash-on-cash</span>
              <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><b style={{ color: (coc ?? 0) >= N('minCoC') ? 'var(--green)' : 'var(--amber)' }}>{coc != null ? coc.toFixed(1) + '%' : '—'}</b><Badge ok={(coc ?? 0) >= N('minCoC')} text={(coc ?? 0) >= N('minCoC') ? 'PASS' : 'below min'} /></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '13px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text2)' }}>DSCR</span>
              <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><b style={{ color: (dscr ?? 0) >= N('minDSCR') ? 'var(--green)' : 'var(--amber)' }}>{dscr != null ? dscr.toFixed(2) + 'x' : '—'}</b><Badge ok={(dscr ?? 0) >= N('minDSCR')} text={(dscr ?? 0) >= N('minDSCR') ? 'PASS' : 'below min'} /></span>
            </div>
            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: meets ? 'var(--green-bg)' : 'var(--amber-bg)', color: meets ? 'var(--green)' : 'var(--amber)', fontSize: '12px', fontWeight: 600 }}>
              {meets ? '✅ This deal type fits your Buy Box — deploy with confidence.' : '⚠ Doesn’t meet your minimums — tighten price, rent, or rate before buying.'}
            </div>
          </div>
        </div>

        {/* SNOWBALL */}
        <div style={{ ...card, borderColor: 'var(--green)' }}>
          <div style={sec}>❄️ The Snowball · if you repeat this {box.recycle ? '(recycling capital)' : '(no recycling)'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {snap.map(s => (
              <div key={s.y} style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700 }}>YEAR {s.y}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>{s.doors}<span style={{ fontSize: '11px', color: 'var(--text3)' }}> doors</span></div>
                <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>{fm(s.cf / 12)}/mo</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{fm(s.value)} value</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '10px', lineHeight: 1.55 }}>
            Illustrative compounding: starting capital buys doors; cash flow is reinvested{box.recycle ? ', and each deal is refinanced to pull ~70% of the cash back out to buy the next one (BRRRR)' : ''}. Real life is lumpier — deals take time, refis need seasoning &amp; equity, and rates/rents vary. This shows the <strong>direction &amp; power of recycling capital</strong>, not a guarantee.
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6, maxWidth: '740px' }}>
          <strong>The discipline:</strong> keep a reserve (don&apos;t deploy 100%), only buy what clears your Buy Box, and have criteria set <em>before</em> the cash lands so you act fast without forcing a bad deal. Education &amp; planning — not financial advice.
        </div>
      </div>
    </AppShell>
  )
}
