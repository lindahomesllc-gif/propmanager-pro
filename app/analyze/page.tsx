'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, monthlyPI } from '@/lib/supabase'
import StrategyFlow from '@/components/StrategyFlow'

// Deal Analyzer — confirms profitability beyond surface cash flow:
// 1) reserves-adjusted "true" cash flow, 2) total return + multi-year projection,
// 3) quick-screen rules, 4) stress test. Reads the property; you tune assumptions.
const GLOSSARY = [
  { k: 'True cash flow', what: 'Rent − taxes, insurance & operating costs − reserves for vacancy, repairs, big-ticket replacements & management.', good: 'Positive after reserves. Gross-only “cash flow” lies; this is the honest one.', use: 'If this is negative, the deal leans entirely on appreciation & loan paydown to win.' },
  { k: 'Reserves (vac/maint/capex/mgmt)', what: 'Money you set aside every month for the costs that don’t hit monthly but always come.', good: '~25–35% of rent combined is realistic for a single-family rental.', use: 'Skipping reserves is how investors “make money” on paper and lose it the year the roof goes.' },
  { k: 'True cash-on-cash (CoC)', what: 'True annual cash flow ÷ the actual cash you put in (down payment + closing + rehab).', good: '≥8% solid, ≥10% strong. Below ~4% your cash is barely working.', use: 'The return on the dollars you actually sank in — the apples-to-apples vs. other investments.' },
  { k: 'Total return', what: 'Cash flow + loan paydown + appreciation + tax savings over your hold period.', good: 'Beats ~7–10% (stock market)? Your money is working harder here.', use: 'The real wealth number — cash flow alone undersells a leveraged rental.' },
  { k: '1% rule', what: 'Monthly rent ÷ purchase price.', good: '≥1% strong cash-flow signal; 0.7–1% workable; below 0.7% is an appreciation bet.', use: 'A 10-second screen — not a verdict. Pairs with the full cash-flow math.' },
  { k: 'Gross Rent Multiplier (GRM)', what: 'Price ÷ annual gross rent.', good: 'Lower is cheaper per rent dollar; ≤10 is strong in most markets.', use: 'Quick way to compare how richly two properties are priced relative to rent.' },
  { k: 'Expense ratio', what: 'Operating costs + reserves ÷ gross rent.', good: '35–50% is healthy; over ~60% something is heavy (taxes, insurance, mgmt).', use: 'High ratio = thin margins; find what’s bloated before you buy.' },
  { k: 'Break-even occupancy', what: 'The occupancy you need just to cover costs + the mortgage.', good: 'Lower = more cushion; under ~85% means you can absorb some vacancy.', use: 'Above ~95% and one empty month puts you underwater — risky.' },
  { k: 'Stress test', what: 'Cash flow if rent drops and your rate rises at the same time.', good: 'Still positive = durable. Goes negative = you’d feed it cash in a downturn.', use: 'Pressure-test before you buy or refinance — not after.' },
]
function amortizeForward(balance: number, annualRate: number, pmt: number, months: number) {
  const r = annualRate / 100 / 12
  let b = balance, paid = 0
  for (let i = 0; i < months && b > 0; i++) {
    const interest = b * r
    let principal = pmt - interest
    if (principal > b) principal = b
    if (principal < 0) principal = 0
    b -= principal; paid += principal
  }
  return { endBalance: Math.max(0, b), principalPaid: paid }
}

export default function AnalyzePage() {
  const [properties, setProperties] = useState<any[]>([])
  const [mortgages, setMortgages] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState('')

  // assumptions
  const [vac, setVac] = useState('5'), [maint, setMaint] = useState('8'), [capex, setCapex] = useState('8'), [mgmt, setMgmt] = useState('8')
  const [taxA, setTaxA] = useState(''), [insA, setInsA] = useState(''), [otherA, setOtherA] = useState('0')
  const [appr, setAppr] = useState('3'), [rentG, setRentG] = useState('2'), [expG, setExpG] = useState('2'), [hold, setHold] = useState('5')
  const [taxRate, setTaxRate] = useState('24'), [landPct, setLandPct] = useState('20')
  const [rentDrop, setRentDrop] = useState('10'), [rateUp, setRateUp] = useState('1.5')
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('properties').select('id, address, market_value, purchase_price, annual_tax, insurance_premium, cash_invested'),
      supabase.from('mortgages').select('*').eq('is_paid_off', false),
      supabase.from('leases').select('property_id, rent_amount, status').eq('status', 'executed'),
      supabase.from('units').select('property_id, market_rent'),
    ]).then(([p, m, l, u]) => {
      const props = p.data || []
      setProperties(props); setMortgages(m.data || []); setLeases(l.data || []); setUnits(u.data || [])
      if (props.length) setSelId(props[0].id)
      setLoading(false)
    })
  }, [])

  // Persist the tunable assumptions per browser (like the Buy Box) so they don't reset
  // every visit. Property-specific tax/insurance are NOT stored here — they reload per property.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('analyzeAssumptions') || 'null')
      if (s) {
        const A: Record<string, (v: string) => void> = { vac: setVac, maint: setMaint, capex: setCapex, mgmt: setMgmt, otherA: setOtherA, appr: setAppr, rentG: setRentG, expG: setExpG, hold: setHold, taxRate: setTaxRate, landPct: setLandPct, rentDrop: setRentDrop, rateUp: setRateUp }
        Object.entries(A).forEach(([k, setter]) => { if (s[k] != null) setter(String(s[k])) })
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    try { localStorage.setItem('analyzeAssumptions', JSON.stringify({ vac, maint, capex, mgmt, otherA, appr, rentG, expG, hold, taxRate, landPct, rentDrop, rateUp })) } catch {}
  }, [vac, maint, capex, mgmt, otherA, appr, rentG, expG, hold, taxRate, landPct, rentDrop, rateUp])

  const sel = properties.find(p => p.id === selId)
  const mtg = mortgages.find(m => m.property_id === selId)

  useEffect(() => {
    if (!sel) return
    setTaxA(sel.annual_tax ? String(sel.annual_tax) : '')
    setInsA(sel.insurance_premium ? String(sel.insurance_premium) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, properties.length])

  // base figures
  const grossRent = leases.filter(l => l.property_id === selId).reduce((s, l) => s + (l.rent_amount || 0), 0) * 12
  const monthlyRent = grossRent / 12
  const value = sel?.market_value || sel?.purchase_price || 0
  const price = sel?.purchase_price || value
  const balance = mtg?.current_balance || 0
  const rate = mtg?.interest_rate || 0
  const curPI = mtg ? monthlyPI({ original_amount: mtg.original_amount, interest_rate: mtg.interest_rate, term_years: mtg.term_years }) : 0
  const debtAnnual = curPI * 12
  const cashInvested = sel?.cash_invested || 0
  const N = (v: string) => parseFloat(v) || 0

  // 1) reserves-adjusted true cash flow
  const fixedOpex = N(taxA) + N(insA) + N(otherA)
  const reservePct = (N(vac) + N(maint) + N(capex) + N(mgmt)) / 100
  const reserves = grossRent * reservePct
  const grossNOI = grossRent - fixedOpex                 // before reserves
  const trueNOI = grossRent - fixedOpex - reserves       // honest
  const grossCF = grossNOI - debtAnnual
  const trueCF = trueNOI - debtAnnual
  const trueCoC = cashInvested > 0 ? trueCF / cashInvested * 100 : null
  const grossCoC = cashInvested > 0 ? grossCF / cashInvested * 100 : null

  // 2) total return + projection
  const years = Math.min(30, Math.max(1, Math.round(N(hold))))
  const buildingBasis = price * (1 - N(landPct) / 100)
  const annualDep = buildingBasis / 27.5
  let bal = balance, val = value, cumCF = 0, cumTax = 0
  const proj: any[] = []
  for (let y = 1; y <= years; y++) {
    const rent = grossRent * Math.pow(1 + N(rentG) / 100, y - 1)
    const opex = fixedOpex * Math.pow(1 + N(expG) / 100, y - 1)
    const res = rent * reservePct
    const noi = rent - opex - res
    const cf = noi - debtAnnual
    const am = amortizeForward(bal, rate, curPI, 12); bal = am.endBalance
    val = val * (1 + N(appr) / 100)
    const taxSave = annualDep * (N(taxRate) / 100)
    cumCF += cf; cumTax += taxSave
    proj.push({ y, cf, paydown: am.principalPaid, equity: val - bal, value: val })
  }
  const equityStart = value - balance
  const equityEnd = val - bal
  const totalReturn = cumCF + (equityEnd - equityStart) + cumTax
  const equityMultiple = cashInvested > 0 ? (cashInvested + totalReturn) / cashInvested : null
  const avgAnnual = cashInvested > 0 ? totalReturn / years / cashInvested * 100 : null

  // 3) quick-screen
  const onePct = price > 0 ? monthlyRent / price * 100 : null
  const grm = grossRent > 0 ? price / grossRent : null
  const expRatio = grossRent > 0 ? (fixedOpex + reserves) / grossRent * 100 : null
  const opexExVac = fixedOpex + grossRent * ((N(maint) + N(capex) + N(mgmt)) / 100)
  const breakEvenOcc = grossRent > 0 ? (opexExVac + debtAnnual) / grossRent * 100 : null

  // 4) stress test
  const sRent = grossRent * (1 - N(rentDrop) / 100)
  const sRes = sRent * reservePct
  const sDebt = monthlyPI({ original_amount: balance, interest_rate: rate + N(rateUp), term_years: mtg?.term_years || 30 }) * 12
  const sTrueCF = sRent - fixedOpex - sRes - (balance > 0 ? sDebt : 0)

  // 5) opportunities & strategy — tailored recommendations from the property's own numbers
  const equity = value - balance
  const roeTrue = equity > 0 ? trueCF / equity * 100 : null
  const unitMarket = units.filter(u => u.property_id === selId).reduce((s, u) => s + (u.market_rent || 0), 0)
  const rentGapMo = unitMarket > 0 ? unitMarket - monthlyRent : 0
  // Data-completeness guard: don't hand out confident verdicts off half-filled inputs.
  // Missing taxes/insurance overstate cash flow, CoC and return — flag the gap instead.
  const opexComplete = N(taxA) > 0 && N(insA) > 0
  const dataGaps: string[] = []
  if (!value) dataGaps.push('property value')
  if (grossRent <= 0) dataGaps.push('rent / active lease')
  if (N(taxA) <= 0) dataGaps.push('property taxes')
  if (N(insA) <= 0) dataGaps.push('insurance')
  const recs: any[] = []
  if (dataGaps.length) recs.push({ icon: '⚠️', title: 'Fill in this property’s data for an accurate read', why: `Missing ${dataGaps.join(', ')} — until added, the cash-flow, ROI and return figures here are estimates and likely overstated.`, action: 'Add the missing numbers on the property page so every metric is trustworthy.', href: `/properties/${selId}/edit` })
  if (rentGapMo > 25) recs.push({ icon: '💸', title: 'Raise rent toward market', why: `Unit targets total ${fm(unitMarket)}/mo but you're collecting ${fm(monthlyRent)}/mo — about ${fm(rentGapMo)}/mo (${fm(rentGapMo * 12)}/yr) left on the table.`, action: 'Bump rent at renewal; even a partial increase closes the gap and lifts value.', href: `/properties/${selId}?tab=units` })
  if (balance === 0 && equity > 50000) recs.push({ icon: '🏦', title: 'Tap idle equity to buy the next one', why: `Owned free & clear with ${fm(equity)} of equity just sitting there.`, action: `A cash-out refi (~70–75% LTV ≈ ${fm(value * 0.72)}) could fund another purchase while this keeps cash-flowing — the classic recycle-your-capital move.`, href: '/modeler' })
  else if (roeTrue != null && roeTrue < 5 && equity > 50000) recs.push({ icon: '🐌', title: 'Your equity may be "lazy"', why: `Return on equity is only ${roeTrue.toFixed(1)}% — that ${fm(equity)} could work harder elsewhere.`, action: 'Consider a cash-out refi to redeploy, or a 1031 sale into a higher-yield property.', href: '/modeler' })
  if (trueCF < 0) recs.push({ icon: '⚠️', title: 'Thin / negative true cash flow', why: `After honest reserves it runs ${fm(trueCF / 12)}/mo — leaning on appreciation & paydown to win.`, action: 'Raise rent, trim expenses, or (if buying) negotiate a lower price.', href: `/properties/${selId}?tab=units` })
  if (opexComplete && trueCoC != null && trueCoC >= 10) recs.push({ icon: '⭐', title: 'Strong performer — hold & harvest', why: `True cash-on-cash of ${trueCoC.toFixed(1)}% is excellent.`, action: 'A keeper — let it season, then pull equity later to scale without selling.' })
  if (onePct != null && onePct < 0.7) recs.push({ icon: '📈', title: 'Appreciation play, not cash flow', why: `Rent is just ${onePct.toFixed(2)}% of value (1% rule) — current yield is thin.`, action: "Make sure your market's rent growth + appreciation justify the low yield. Great for wealth-building, weak for monthly income." })
  if (sTrueCF < 0) recs.push({ icon: '🧪', title: 'Vulnerable under stress', why: `A ${N(rentDrop)}% rent drop / +${N(rateUp)}% rate flips it cash-flow negative.`, action: "Keep a fatter reserve and don't over-leverage this one." })
  if (opexComplete && avgAnnual != null && avgAnnual >= 12) recs.push({ icon: '🚀', title: 'Excellent total return', why: `~${avgAnnual.toFixed(0)}%/yr on your cash once paydown + appreciation + tax savings count — well above stocks.`, action: 'Strong hold; reinvest the cash flow to compound faster.' })

  const inp = { width: '100%', padding: '7px 9px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '3px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }
  const sec = { fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }
  const row = (label: string, val: string, color = 'var(--text)', strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
      <span style={{ color: 'var(--text2)' }}>{label}</span><span style={{ color, fontWeight: strong ? 700 : 600 }}>{val}</span>
    </div>
  )
  const Badge = ({ ok, warn, text }: any) => <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: ok ? 'var(--green-bg)' : warn ? 'var(--amber-bg)' : 'var(--red-bg)', color: ok ? 'var(--green)' : warn ? 'var(--amber)' : 'var(--red)' }}>{text}</span>

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🔍 Deal Analyzer</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selId && <a href={'/modeler?property=' + selId} className='btn btn-ghost no-print'>🧮 Model →</a>}
          <button onClick={() => window.print()} className='btn btn-ghost no-print'>🖨 PDF</button>
          {properties.length > 0 && (
            <select value={selId} onChange={e => setSelId(e.target.value)} style={{ ...inp, width: 'auto', minWidth: '220px' }}>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <StrategyFlow step={1} propertyId={selId} />
        {loading ? <div className='skeleton' style={{ height: '300px' }} /> : !sel ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text3)' }}>Add a property to analyze.</div>
        ) : (
          <>
            {/* base snapshot */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '10px', marginBottom: '18px' }}>
              {[['Rent /mo', fm(monthlyRent)], ['Value', fm(value)], ['Loan', fm(balance)], ['Cash invested', fm(cashInvested)]].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={lbl}>{l}</div><div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>{v}</div>
                </div>
              ))}
            </div>
            {cashInvested === 0 && <div style={{ fontSize: '12px', color: 'var(--amber)', marginBottom: '14px' }}>⚠ Set <strong>Cash Invested</strong> on this property (Edit) to get true cash-on-cash and total return.</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: '16px' }}>
              {/* 1. TRUE CASH FLOW */}
              <div style={card}>
                <div style={sec}>💧 True Cash Flow <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: '11px' }}>· after reserves</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div><label style={lbl}>Vac %</label><input style={inp} value={vac} onChange={e => setVac(e.target.value)} /></div>
                  <div><label style={lbl}>Maint %</label><input style={inp} value={maint} onChange={e => setMaint(e.target.value)} /></div>
                  <div><label style={lbl}>CapEx %</label><input style={inp} value={capex} onChange={e => setCapex(e.target.value)} /></div>
                  <div><label style={lbl}>Mgmt %</label><input style={inp} value={mgmt} onChange={e => setMgmt(e.target.value)} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div><label style={lbl}>Taxes /yr</label><input style={inp} value={taxA} onChange={e => setTaxA(e.target.value)} /></div>
                  <div><label style={lbl}>Insurance /yr</label><input style={inp} value={insA} onChange={e => setInsA(e.target.value)} /></div>
                  <div><label style={lbl}>Other /yr</label><input style={inp} value={otherA} onChange={e => setOtherA(e.target.value)} /></div>
                </div>
                {row('Gross cash flow', fm(grossCF) + '/yr', grossCF >= 0 ? 'var(--green)' : 'var(--red)')}
                {row('Reserves set-aside', '−' + fm(reserves) + '/yr', 'var(--amber)')}
                {row('TRUE cash flow', fm(trueCF) + '/yr (' + fm(trueCF / 12) + '/mo)', trueCF >= 0 ? 'var(--green)' : 'var(--red)', true)}
                {row('True cash-on-cash', trueCoC != null ? trueCoC.toFixed(1) + '%' : '—', trueCoC != null ? (trueCoC >= 8 ? 'var(--green)' : trueCoC >= 4 ? 'var(--amber)' : 'var(--red)') : 'var(--text3)', true)}
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>The honest number — what's left after setting aside for vacancy, repairs, big-ticket replacements, and management.</div>
              </div>

              {/* 2. TOTAL RETURN */}
              <div style={card}>
                <div style={sec}>📈 Total Return <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: '11px' }}>· over {years} yrs</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div><label style={lbl}>Appr %</label><input style={inp} value={appr} onChange={e => setAppr(e.target.value)} /></div>
                  <div><label style={lbl}>Rent g%</label><input style={inp} value={rentG} onChange={e => setRentG(e.target.value)} /></div>
                  <div><label style={lbl}>Tax %</label><input style={inp} value={taxRate} onChange={e => setTaxRate(e.target.value)} /></div>
                  <div><label style={lbl}>Hold yrs</label><input style={inp} value={hold} onChange={e => setHold(e.target.value)} /></div>
                </div>
                {row('Cumulative cash flow', fm(cumCF), cumCF >= 0 ? 'var(--green)' : 'var(--red)')}
                {row('Loan paydown + appreciation', fm(equityEnd - equityStart), 'var(--green)')}
                {row('Tax savings (depreciation)', fm(cumTax), 'var(--green)')}
                {row('TOTAL ' + years + '-yr return', fm(totalReturn), totalReturn >= 0 ? 'var(--green)' : 'var(--red)', true)}
                {row('Avg annual return on cash', avgAnnual != null ? avgAnnual.toFixed(1) + '%/yr' : '—', avgAnnual != null ? (avgAnnual >= 10 ? 'var(--green)' : avgAnnual >= 6 ? 'var(--amber)' : 'var(--red)') : 'var(--text3)', true)}
                {row('Equity multiple', equityMultiple != null ? equityMultiple.toFixed(2) + 'x' : '—', 'var(--text)')}
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>The real wealth number: cash flow <strong>+ loan paydown + appreciation + tax savings</strong>. Beats ~7–10% (stocks)? Then your cash is working.</div>
              </div>

              {/* 3. QUICK SCREEN */}
              <div style={card}>
                <div style={sec}>✅ Quick-Screen <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: '11px' }}>· go / no-go</span></div>
                {[
                  { name: '1% rule (rent ÷ price)', val: onePct != null ? onePct.toFixed(2) + '%' : '—', ok: (onePct || 0) >= 1, warn: (onePct || 0) >= 0.7, hint: '≥1% strong · 0.7–1% ok' },
                  { name: 'Gross Rent Multiplier', val: grm != null ? grm.toFixed(1) : '—', ok: (grm || 99) <= 10, warn: (grm || 99) <= 13, hint: 'lower is better; ≤10 strong' },
                  { name: 'Expense ratio', val: expRatio != null ? expRatio.toFixed(0) + '%' : '—', ok: (expRatio || 99) <= 50, warn: (expRatio || 99) <= 60, hint: '35–50% healthy' },
                  { name: 'Break-even occupancy', val: breakEvenOcc != null ? breakEvenOcc.toFixed(0) + '%' : '—', ok: (breakEvenOcc || 99) <= 85, warn: (breakEvenOcc || 99) <= 95, hint: 'lower = more cushion' },
                ].map(r => (
                  <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <div><div style={{ fontSize: '13px', color: 'var(--text)' }}>{r.name}</div><div style={{ fontSize: '10px', color: 'var(--text3)' }}>{r.hint}</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '13px', fontWeight: 700 }}>{r.val}</span><Badge ok={r.ok} warn={!r.ok && r.warn} text={r.ok ? 'PASS' : r.warn ? 'OK' : 'WEAK'} /></div>
                  </div>
                ))}
              </div>

              {/* 4. STRESS TEST */}
              <div style={card}>
                <div style={sec}>🧪 Stress Test <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: '11px' }}>· does it survive bad news?</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div><label style={lbl}>Rent / occupancy drop %</label><input style={inp} value={rentDrop} onChange={e => setRentDrop(e.target.value)} /></div>
                  <div><label style={lbl}>Rate increase %</label><input style={inp} value={rateUp} onChange={e => setRateUp(e.target.value)} /></div>
                </div>
                {row('Stressed rent', fm(sRent / 12) + '/mo', 'var(--text2)')}
                {row('Stressed debt (P&I)', '−' + fm((balance > 0 ? sDebt : 0) / 12) + '/mo', 'var(--red)')}
                {row('Stressed true cash flow', fm(sTrueCF / 12) + '/mo', sTrueCF >= 0 ? 'var(--green)' : 'var(--red)', true)}
                <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: sTrueCF >= 0 ? 'var(--green-bg)' : 'var(--red-bg)', color: sTrueCF >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '12px', fontWeight: 600 }}>
                  {sTrueCF >= 0 ? '✅ Survives — still cash-flow positive under stress.' : '⚠ Goes negative under stress — you’d feed it cash. Build in a bigger reserve or negotiate a lower price.'}
                </div>
              </div>
            </div>

            {/* 5. OPPORTUNITIES & STRATEGY */}
            <div style={{ ...card, borderColor: 'var(--green)' }}>
              <div style={sec}>💡 Opportunities &amp; Strategy <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: '11px' }}>· what this property could do next</span></div>
              {recs.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Nothing jumping out — a solid, balanced hold. (Set Cash Invested + rents to surface more.)</div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {recs.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--bg3)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{r.icon}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{r.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '3px', lineHeight: 1.5 }}>{r.why}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '5px', lineHeight: 1.5 }}><strong style={{ color: 'var(--green)' }}>→ </strong>{r.action}</div>
                        {r.href && <a href={r.href} style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '5px' }}>Take a look →</a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New-investor guide — same look as Reports & Modeler */}
            <div style={{ marginTop: '18px' }}>
              <button onClick={() => setShowGuide(g => !g)} className='btn btn-ghost no-print' style={{ fontSize: '12px' }}>
                📘 New to these numbers? {showGuide ? 'Hide guide' : 'What each one means →'}
              </button>
              {showGuide && (
                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: '12px' }}>
                  {GLOSSARY.map(g => (
                    <div key={g.k} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{g.k}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '6px' }}><strong style={{ color: 'var(--text3)' }}>What it is:</strong> {g.what}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '6px' }}><strong style={{ color: 'var(--text3)' }}>Good sign:</strong> {g.good}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}><strong style={{ color: 'var(--text3)' }}>How to use it:</strong> {g.use}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6, maxWidth: '760px', marginTop: '14px' }}>
              All figures use the property's current rent, value, loan & cash invested, plus your assumptions above. Planning estimates — depreciation/tax savings are simplified and don't replace your CPA. The decision rule: a confirmed deal has <strong>positive true cash flow</strong>, a <strong>total return that beats your alternatives</strong>, and <strong>survives the stress test</strong>.
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
