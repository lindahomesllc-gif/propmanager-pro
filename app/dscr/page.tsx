'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, monthlyPI, openSigned } from '@/lib/supabase'

// DSCR Loan Package — a print-ready, lender-facing summary for a single property.
// A DSCR lender qualifies on rent ÷ PITIA (P&I + taxes + insurance + HOA), so that
// calculation is the headline; the rest is the supporting property + income detail.

// Full-picture math for one loan scenario over a chosen hold horizon.
function scenarioCalc(s: any, holdMonths = 24) {
  const n = (v: any) => parseFloat(v) || 0
  const loan = n(s.loan), rate = n(s.rate), term = n(s.term), value = n(s.value)
  const taxMo = n(s.tax) / 12, insMo = n(s.ins) / 12, hoaMo = n(s.hoa)
  const r = rate / 100 / 12
  const pi = s.io ? loan * r : monthlyPI({ original_amount: loan, interest_rate: rate, term_years: term })
  const pitia = pi + taxMo + insMo + hoaMo
  const upfront = loan * n(s.orig) / 100 + n(s.other)   // origination points + other upfront (closing, appraisal…)
  // interest actually paid until you refi/sell (principal isn't a cost — it's your equity),
  // plus how much principal you paid down (equity built) and the balance still owed at exit.
  let interestHold = 0, principalHold = 0
  if (s.io) { interestHold = loan * r * holdMonths }
  else { let bal = loan; for (let m = 0; m < holdMonths && bal > 0.01; m++) { const int = bal * r; const prin = Math.min(pi - int, bal); interestHold += int; principalHold += prin; bal -= prin } }
  const endBalance = s.io ? loan : Math.max(0, loan - principalHold)
  return { pi, pitia, dscr: pitia > 0 ? n(s.rent) / pitia : null, ltv: value > 0 ? loan / value * 100 : null, fee: loan * n(s.orig) / 100, upfront, interestHold, totalCostHold: upfront + interestHold, principalHold, endBalance }
}
const dscrTone = (d: number | null) => d == null ? '#888' : d >= 1.25 ? '#16a34a' : d >= 1 ? '#d97706' : '#dc2626'

export default function DscrPackagePage() {
  const [properties, setProperties] = useState<any[]>([])
  const [mortgages, setMortgages] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState('')

  // loan scenario (no-print controls)
  const [purpose, setPurpose] = useState('purchase')   // purchase | refi | cashout
  const [loanAmt, setLoanAmt] = useState('')
  const [rate, setRate] = useState('7.5')
  const [term, setTerm] = useState('30')
  const [io, setIo] = useState(false)
  const [orig, setOrig] = useState('1')                  // origination fee, % of loan (points)
  const [rentBasis, setRentBasis] = useState('inplace') // inplace | market
  const [rentOverride, setRentOverride] = useState('')   // manual market/appraised rent for un-leased deals
  const [includeTerms, setIncludeTerms] = useState(true) // true = full DSCR w/ my terms; false = facts-only for the lender to quote
  const [includeEin, setIncludeEin] = useState(true)     // show borrowing entity's EIN/Tax ID on the sheet
  // manual "no property" scenario inputs
  const [mLabel, setMLabel] = useState('')
  const [mValue, setMValue] = useState('')
  const [mRent, setMRent] = useState('')
  const [mTax, setMTax] = useState('')
  const [mIns, setMIns] = useState('')
  const [mHoa, setMHoa] = useState('')
  // side-by-side scenario comparison
  const [showCompare, setShowCompare] = useState(false)
  const [holdYears, setHoldYears] = useState('2')   // how long until you expect to refi/sell
  const [scenarios, setScenarios] = useState<any[]>([
    { label: 'Higher rate, no points', value: '', rent: '', tax: '', ins: '', hoa: '', loan: '', rate: '8', term: '30', io: false, orig: '0', other: '' },
    { label: 'Lower rate, 2 points', value: '', rent: '', tax: '', ins: '', hoa: '', loan: '', rate: '7', term: '30', io: false, orig: '2', other: '' },
    { label: 'Interest-only', value: '', rent: '', tax: '', ins: '', hoa: '', loan: '', rate: '7.5', term: '30', io: true, orig: '1', other: '' },
  ])
  const setSc = (i: number, k: string, v: any) => setScenarios(prev => prev.map((s, j) => j === i ? { ...s, [k]: v } : s))

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qp = params.get('property')
    Promise.all([
      supabase.from('properties').select('id, address, city, state, zip, type, num_units, bedrooms, bathrooms, sqft, year_built, occupancy_status, market_value, purchase_price, annual_tax, insurance_premium, hoa, hoa_fee, hoa_name, owner_entity, entity_id'),
      supabase.from('mortgages').select('*').eq('is_paid_off', false),
      supabase.from('leases').select('id, property_id, rent_amount, start_date, end_date, status, pdf_url, tenants(full_name)').eq('status', 'executed'),
      supabase.from('units').select('property_id, market_rent, label'),
      supabase.from('entities').select('id, name, ein, type, formation_state'),
    ]).then(([p, m, l, u, e]) => {
      const props = p.data || []
      setProperties(props); setMortgages(m.data || []); setLeases(l.data || []); setUnits(u.data || []); setEntities(e.data || [])
      if (props.length) setSelId(qp && props.some((x: any) => x.id === qp) ? qp : props[0].id)
      setLoading(false)
    })
  }, [])

  const sel = properties.find(p => p.id === selId)
  const mtg = mortgages.find(m => m.property_id === selId)
  const N = (v: string) => parseFloat(v) || 0

  // when the property changes: default the requested loan to ~75% LTV; prefill rate/term from any existing loan
  useEffect(() => {
    if (!sel) return
    const value = sel.market_value || sel.purchase_price || 0
    setLoanAmt(String(Math.round(value * 0.75)))
    if (mtg) { setRate(String(mtg.interest_rate || 7.5)); setTerm(String(mtg.term_years || 30)); setIo(!!mtg.interest_only); setPurpose('refi') }
    else setPurpose('purchase')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, properties.length])

  const isManual = selId === 'manual'
  const value = isManual ? N(mValue) : (sel?.market_value || sel?.purchase_price || 0)
  const inPlaceRent = leases.filter(l => l.property_id === selId).reduce((s, l) => s + (l.rent_amount || 0), 0)
  const marketRent = units.filter(u => u.property_id === selId).reduce((s, u) => s + (u.market_rent || 0), 0)
  const rentMo = isManual ? N(mRent) : (N(rentOverride) > 0 ? N(rentOverride) : (rentBasis === 'market' ? (marketRent || inPlaceRent) : (inPlaceRent || marketRent)))
  const loan = N(loanAmt)
  const pi = io ? loan * (N(rate) / 100 / 12) : monthlyPI({ original_amount: loan, interest_rate: N(rate), term_years: N(term) })
  const taxMo = isManual ? N(mTax) / 12 : (sel?.annual_tax || 0) / 12
  const insMo = isManual ? N(mIns) / 12 : (sel?.insurance_premium || 0) / 12
  const hoaMo = isManual ? N(mHoa) : (sel?.hoa ? (sel?.hoa_fee || 0) : 0)
  const pitia = pi + taxMo + insMo + hoaMo
  const dscr = pitia > 0 ? rentMo / pitia : null
  const ltv = value > 0 ? loan / value * 100 : null
  const origFee = loan * N(orig) / 100
  // fill all compare columns from the current scenario as a starting point
  function seedFromCurrent() {
    const cur = { value: value ? String(value) : '', rent: rentMo ? String(rentMo) : '', tax: taxMo ? String(Math.round(taxMo * 12)) : '', ins: insMo ? String(Math.round(insMo * 12)) : '', hoa: hoaMo ? String(hoaMo) : '', loan: loanAmt, rate, term, io, orig, other: '' }
    setScenarios(prev => prev.map(s => ({ ...cur, label: s.label })))
  }
  const dscrColor = dscr == null ? '#888' : dscr >= 1.25 ? '#16a34a' : dscr >= 1 ? '#d97706' : '#dc2626'
  const dscrVerdict = dscr == null ? '—'
    : dscr >= 1.25 ? 'Strong — clears the 1.25× ratio most DSCR lenders prefer for best pricing.'
    : dscr >= 1 ? 'Qualifies — rent covers the payment (≥1.0×). Lenders price best at 1.25×+.'
    : 'Below 1.0× — rent does not fully cover the payment. Consider a lower loan amount or market rent if higher.'
  const propLeases = leases.filter(l => l.property_id === selId)
  const entity = entities.find(e => e.id === sel?.entity_id)
  const entityName = entity?.name || sel?.owner_entity || ''
  const entityEin = entity?.ein || ''
  const entityState = entity?.formation_state || ''
  const purposeLabel = purpose === 'cashout' ? 'Cash-out refinance' : purpose === 'refi' ? 'Rate/term refinance' : 'Purchase'
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // styles
  const inp: any = { width: '100%', padding: '7px 9px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }
  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '3px' }
  const card: any = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px 22px', marginBottom: '14px' }
  const sec: any = { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: '12px' }
  const row = (k: string, v: string, strong = false, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
      <span className='lbl-muted' style={{ color: 'var(--text2)' }}>{k}</span>
      <span style={{ color: color || 'var(--text)', fontWeight: strong ? 700 : 600 }}>{v}</span>
    </div>
  )
  const fact = (k: string, v: string) => (
    <div className='dscr-box' style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px', border: '0.5px solid var(--border)' }}>
      <div className='lbl-muted' style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{k}</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>{v}</div>
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>📄 DSCR Loan Package</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowCompare(v => !v)} className='btn btn-ghost no-print'>{showCompare ? '✓ Comparing' : '⚖ Compare'}</button>
          <button onClick={() => window.print()} className='btn btn-primary no-print'>🖨 Save as PDF</button>
          <select value={selId} onChange={e => setSelId(e.target.value)} className='no-print' style={{ ...inp, width: 'auto', minWidth: '220px' }}>
            <option value='manual'>🧮 New scenario (no property)</option>
            {properties.length > 0 && <option disabled>──────────</option>}
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? <div className='skeleton' style={{ height: '300px' }} /> : (!sel && !isManual) ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text3)' }}>Pick a property, or choose <strong>🧮 New scenario</strong> to run numbers manually.</div>
        ) : (
          <>
            {/* side-by-side scenario comparison (not printed) */}
            {showCompare && (() => {
              const holdMonths = (parseFloat(holdYears) || 0) * 12
              const calcs = scenarios.map(s => scenarioCalc(s, holdMonths))
              const totals = calcs.map(c => c.totalCostHold).filter(t => t > 0)
              const minTotal = totals.length ? Math.min(...totals) : -1
              // break-even for upfront cost: months for a lower payment to recover extra points vs the lowest-upfront column
              const baseIdx = calcs.reduce((mi, c, i) => c.upfront < calcs[mi].upfront ? i : mi, 0)
              const breakeven = (i: number) => {
                const extra = calcs[i].upfront - calcs[baseIdx].upfront
                const save = calcs[baseIdx].pi - calcs[i].pi
                if (extra <= 0) return '—'
                if (save <= 0) return 'never'
                return '~' + (extra / save / 12).toFixed(1) + ' yr'
              }
              const fields: [string, string][] = [['value', 'Property value'], ['rent', 'Monthly rent'], ['tax', 'Annual taxes'], ['ins', 'Annual insurance'], ['hoa', 'HOA /mo'], ['loan', 'Loan amount'], ['rate', 'Rate %'], ['term', 'Term (yrs)'], ['orig', 'Origination %'], ['other', 'Other upfront $']]
              const rl: any = { padding: '6px 8px', fontSize: '11px', color: 'var(--text2)', whiteSpace: 'nowrap', textAlign: 'left' }
              const rlb: any = { ...rl, fontWeight: 700, color: 'var(--text)' }
              const cel: any = { padding: '3px 5px' }
              const ci: any = { width: '100%', padding: '5px 7px', fontSize: '12px', border: '0.5px solid var(--border2)', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', textAlign: 'right' }
              const rc: any = { padding: '5px 8px', fontSize: '13px', textAlign: 'right', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }
              return (
                <div className='no-print' style={{ ...card, borderColor: 'var(--blue)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={sec}>⚖ Compare Scenarios <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text3)' }}>· the whole picture, not just the rate</span></div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '6px' }}>Hold until refi/sell: <input value={holdYears} onChange={e => setHoldYears(e.target.value)} style={{ width: '46px', padding: '5px 7px', fontSize: '12px', border: '0.5px solid var(--border2)', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', textAlign: 'center' }} /> yrs</label>
                      <button onClick={seedFromCurrent} className='btn btn-ghost' style={{ fontSize: '11px' }}>↩ Seed from current</button>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                      <thead><tr><th style={rl}></th>{scenarios.map((s, i) => (
                        <th key={i} style={{ padding: '4px 5px', width: '28%' }}><input value={s.label} onChange={e => setSc(i, 'label', e.target.value)} style={{ ...ci, textAlign: 'center', fontWeight: 700 }} /></th>
                      ))}</tr></thead>
                      <tbody>
                        {fields.map(([k, label]) => (
                          <tr key={k}>
                            <td style={rl}>{label}</td>
                            {scenarios.map((s, i) => <td key={i} style={cel}><input value={s[k]} onChange={e => setSc(i, k, e.target.value)} style={ci} /></td>)}
                          </tr>
                        ))}
                        <tr>
                          <td style={rl}>Interest-only</td>
                          {scenarios.map((s, i) => <td key={i} style={{ ...cel, textAlign: 'center' }}><input type='checkbox' checked={s.io} onChange={e => setSc(i, 'io', e.target.checked)} style={{ width: '15px', height: '15px', accentColor: 'var(--green)' }} /></td>)}
                        </tr>
                        <tr style={{ borderTop: '0.5px solid var(--border)' }}><td style={rlb}>P&amp;I /mo</td>{calcs.map((c, i) => <td key={i} style={rc}>{fm(c.pi)}</td>)}</tr>
                        <tr><td style={rlb}>Total PITIA /mo</td>{calcs.map((c, i) => <td key={i} style={rc}>{fm(c.pitia)}</td>)}</tr>
                        <tr><td style={rl}>LTV</td>{calcs.map((c, i) => <td key={i} style={{ ...rc, fontWeight: 400, color: 'var(--text2)' }}>{c.ltv != null ? c.ltv.toFixed(0) + '%' : '—'}</td>)}</tr>
                        <tr><td style={rl}>Origination fee</td>{calcs.map((c, i) => <td key={i} style={{ ...rc, fontWeight: 400, color: 'var(--text2)' }}>{fm(c.fee)}</td>)}</tr>
                        <tr style={{ borderTop: '0.5px solid var(--border)' }}><td style={rlb}>DSCR</td>{calcs.map((c, i) => <td key={i} style={{ ...rc, fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, color: dscrTone(c.dscr) }}>{c.dscr != null ? c.dscr.toFixed(2) + '×' : '—'}</td>)}</tr>
                        <tr><td style={rl}></td>{calcs.map((c, i) => <td key={i} style={{ ...rc, fontSize: '10px', fontWeight: 700, color: dscrTone(c.dscr) }}>{c.dscr == null ? '' : c.dscr >= 1.25 ? '✓ Strong' : c.dscr >= 1 ? 'Qualifies' : 'Short'}</td>)}</tr>
                        {/* the cost picture over your actual hold */}
                        <tr style={{ borderTop: '0.5px solid var(--border)' }}><td style={rl}>Upfront cost</td>{calcs.map((c, i) => <td key={i} style={{ ...rc, fontWeight: 400, color: 'var(--text2)' }}>{fm(c.upfront)}</td>)}</tr>
                        <tr><td style={rl}>Interest paid in {holdYears || 0} yr</td>{calcs.map((c, i) => <td key={i} style={{ ...rc, fontWeight: 400, color: 'var(--text2)' }}>{fm(c.interestHold)}</td>)}</tr>
                        <tr><td style={rlb}>Total cost over {holdYears || 0} yr</td>{calcs.map((c, i) => <td key={i} style={{ ...rc, fontWeight: c.totalCostHold === minTotal ? 800 : 600, color: c.totalCostHold === minTotal ? 'var(--green)' : 'var(--text)' }}>{fm(c.totalCostHold)}{c.totalCostHold === minTotal && minTotal > 0 ? ' ✓' : ''}</td>)}</tr>
                        <tr><td style={rl}>Points pay off after</td>{calcs.map((c, i) => { const b = breakeven(i); return <td key={i} style={{ ...rc, fontWeight: 400, fontSize: '12px', color: b === 'never' ? 'var(--red)' : b === '—' ? 'var(--text3)' : (parseFloat(b.replace(/[^\d.]/g, '')) <= (parseFloat(holdYears) || 0) ? 'var(--green)' : 'var(--amber)') }}>{b}</td> })}</tr>
                        {/* equity side — what IO gives up */}
                        <tr style={{ borderTop: '0.5px solid var(--border)' }}><td style={rl}>Principal paid in {holdYears || 0} yr</td>{calcs.map((c, i) => <td key={i} style={{ ...rc, fontWeight: 400, color: c.principalHold > 0 ? 'var(--green)' : 'var(--text3)' }}>{c.principalHold > 0 ? fm(c.principalHold) : '$0 (IO)'}</td>)}</tr>
                        <tr><td style={rl}>Balance owed after {holdYears || 0} yr</td>{calcs.map((c, i) => <td key={i} style={{ ...rc, fontWeight: 400, color: 'var(--text2)' }}>{fm(c.endBalance)}</td>)}</tr>
                        <tr><td style={rlb}>Equity at exit <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(flat value)</span></td>{calcs.map((c, i) => { const eq = (parseFloat(scenarios[i].value) || 0) - c.endBalance; return <td key={i} style={{ ...rc, fontWeight: 700, color: eq >= 0 ? 'var(--green)' : 'var(--red)' }}>{(parseFloat(scenarios[i].value) || 0) > 0 ? fm(eq) : '—'}</td> })}</tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px', lineHeight: 1.5 }}><strong style={{ color: 'var(--text2)' }}>Total cost</strong> = upfront fees + interest over your hold. <strong style={{ color: 'var(--text2)' }}>Interest-only</strong> has the lowest payment + often the lowest cost, but pays <strong>$0 principal</strong> — you owe the full balance at exit and build equity only from appreciation. Amortizing costs a bit more but the &quot;principal paid&quot; row is equity you keep. <strong style={{ color: 'var(--text2)' }}>Points pay off after</strong> = years for the lower payment to recover its extra upfront vs the cheapest-upfront column (green = recovered within your hold; red = never). <strong style={{ color: 'var(--text2)' }}>Equity at exit</strong> = value − balance owed (flat value; appreciation would add on top). DSCR: green ≥1.25× · amber ≥1.0× · red &lt;1.0×.</div>
                </div>
              )
            })()}

            {/* manual property inputs — only when running a blank scenario (not printed) */}
            {isManual && (
              <div className='no-print' style={{ ...card, borderColor: 'var(--blue)' }}>
                <div style={sec}>🧮 Scenario Inputs <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text3)' }}>· type the numbers to test any deal</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Label / address (optional)</label><input style={inp} placeholder='e.g. 123 Oak St — offer scenario' value={mLabel} onChange={e => setMLabel(e.target.value)} /></div>
                  <div><label style={lbl}>Property value / price</label><input style={inp} value={mValue} onChange={e => setMValue(e.target.value)} /></div>
                  <div><label style={lbl}>Monthly rent</label><input style={inp} value={mRent} onChange={e => setMRent(e.target.value)} /></div>
                  <div><label style={lbl}>Annual property taxes</label><input style={inp} value={mTax} onChange={e => setMTax(e.target.value)} /></div>
                  <div><label style={lbl}>Annual insurance</label><input style={inp} value={mIns} onChange={e => setMIns(e.target.value)} /></div>
                  <div><label style={lbl}>HOA /mo</label><input style={inp} value={mHoa} onChange={e => setMHoa(e.target.value)} /></div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>Then set your loan terms below. The DSCR updates live. Nothing is saved to a property.</div>
              </div>
            )}
            {/* loan scenario controls (not printed) */}
            <div className='no-print' style={{ ...card, borderColor: 'var(--green)' }}>
              <div style={sec}>Package Type <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text3)' }}>· tune, then Save as PDF</span></div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {[[true, '📄 Include my terms & DSCR', 'for your analysis / documenting agreed terms'], [false, '🏦 Property & rent only', 'let the lender quote terms — recommended to send']].map(([v, l, h]) => (
                  <button key={String(v)} type='button' onClick={() => setIncludeTerms(v as boolean)} style={{ flex: '1 1 220px', textAlign: 'left', padding: '10px 14px', fontSize: '12px', borderRadius: '9px', border: '0.5px solid ' + (includeTerms === v ? 'var(--green)' : 'var(--border2)'), background: includeTerms === v ? 'var(--green-bg)' : 'transparent', color: includeTerms === v ? 'var(--green)' : 'var(--text2)', cursor: 'pointer', fontWeight: includeTerms === v ? 700 : 400 }}>
                    {l as string}<div style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text3)', marginTop: '2px' }}>{h as string}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px' }}>
                <div><label style={lbl}>Purpose</label>
                  <select value={purpose} onChange={e => setPurpose(e.target.value)} style={inp}>
                    <option value='purchase'>Purchase</option>
                    <option value='refi'>Rate/term refinance</option>
                    <option value='cashout'>Cash-out refinance</option>
                  </select>
                </div>
                <div><label style={lbl}>Requested loan</label><input style={inp} value={loanAmt} onChange={e => setLoanAmt(e.target.value)} /></div>
                {includeTerms && <div><label style={lbl}>Rate %</label><input style={inp} value={rate} onChange={e => setRate(e.target.value)} /></div>}
                {includeTerms && <div><label style={lbl}>Term (yrs)</label><input style={inp} value={term} onChange={e => setTerm(e.target.value)} /></div>}
                {includeTerms && <div><label style={lbl}>Origination %</label><input style={inp} value={orig} onChange={e => setOrig(e.target.value)} /></div>}
                {!isManual && <div><label style={lbl}>Rent basis</label>
                  <select value={rentBasis} onChange={e => setRentBasis(e.target.value)} style={inp} disabled={N(rentOverride) > 0}>
                    <option value='inplace'>In-place lease</option>
                    <option value='market'>Market rent</option>
                  </select>
                </div>}
                {!isManual && <div><label style={lbl}>Rent override /mo</label><input style={inp} placeholder='if not leased' value={rentOverride} onChange={e => setRentOverride(e.target.value)} /></div>}
                {entityEin && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '7px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}>
                      <input type='checkbox' checked={includeEin} onChange={e => setIncludeEin(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: 'var(--green)' }} /> Show entity Tax ID
                    </label>
                  </div>
                )}
                {includeTerms && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '7px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}>
                      <input type='checkbox' checked={io} onChange={e => setIo(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: 'var(--green)' }} /> Interest-only
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Rental agreements — download to attach to the lender's portal (not printed) */}
            {!isManual && <div className='no-print' style={{ ...card }}>
              <div style={sec}>📎 Rental Agreements <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text3)' }}>· download to attach to your lender</span></div>
              {propLeases.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No executed leases on this property.</div>
              ) : propLeases.map((l: any) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text)' }}>{l.tenants?.full_name || 'Tenant'} · {fm(l.rent_amount)}/mo{l.end_date ? ' · thru ' + new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}</div>
                  {l.pdf_url
                    ? <button onClick={() => openSigned(l.pdf_url)} className='btn btn-ghost' style={{ fontSize: '12px' }}>⬇ Download lease PDF</button>
                    : <a href={'/leases/' + l.id} className='btn btn-ghost' style={{ fontSize: '12px', color: 'var(--amber)' }}>⚠ No PDF — upload on lease →</a>}
                </div>
              ))}
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '10px', lineHeight: 1.5 }}>Tip: download each lease here, then attach the files in your lender&apos;s upload box. (Browsers don&apos;t allow dragging straight from one site into another.)</div>
            </div>}

            {/* ===== The printable package ===== */}
            <div className='dscr-doc'>
              {/* document header */}
              <div className='dscr-card' style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{includeTerms ? 'DSCR Loan Qualification Summary' : 'Property & Rent Summary'}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text)', marginTop: '6px', fontWeight: 600 }}>{isManual ? (mLabel || 'DSCR Scenario') : `${sel.address}${sel.city ? ', ' + sel.city : ''} ${sel.state || ''} ${sel.zip || ''}`}</div>
                    {entityName && <div className='lbl-muted' style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>Borrowing entity: {entityName}{entity?.type ? ' (' + entity.type.toUpperCase() + ')' : ''}{entityState ? ' · ' + entityState : ''}{includeEin && entityEin ? ' · Tax ID (EIN): ' + entityEin : ''}</div>}
                  </div>
                  <div className='lbl-muted' style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'right' }}>Prepared {today}<br />{purposeLabel}</div>
                </div>
              </div>

              {/* Headline: full DSCR, or rent + carrying costs only (lender computes DSCR) */}
              {includeTerms ? (
                <div className='dscr-card' style={card}>
                  <div style={sec}>Debt Service Coverage Ratio</div>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                    <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                      {row('Gross monthly rent', fm(rentMo) + (N(rentOverride) > 0 ? ' (estimated)' : rentBasis === 'market' ? ' (market)' : ''))}
                      <div style={{ height: '6px' }} />
                      {row('Principal & interest', fm(pi) + (io ? ' (IO)' : ''))}
                      {row('Property taxes ÷ 12', fm(taxMo))}
                      {row('Insurance ÷ 12', fm(insMo))}
                      {row('HOA dues', fm(hoaMo))}
                      {row('Total PITIA', fm(pitia), true)}
                    </div>
                    <div className='dscr-box' style={{ flex: '1 1 200px', minWidth: '180px', background: 'var(--bg3)', borderRadius: '12px', border: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
                      <div className='lbl-muted' style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>DSCR (rent ÷ PITIA)</div>
                      <div className='keep-color' style={{ fontFamily: 'Syne, sans-serif', fontSize: '46px', fontWeight: 800, color: dscrColor, lineHeight: 1.1, marginTop: '4px' }}>{dscr != null ? dscr.toFixed(2) + '×' : '—'}</div>
                      <div className='lbl-muted' style={{ fontSize: '11.5px', color: 'var(--text2)', textAlign: 'center', marginTop: '8px', lineHeight: 1.45 }}>{dscrVerdict}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='dscr-card' style={card}>
                  <div style={sec}>Rent &amp; Fixed Operating Costs</div>
                  {row('Gross monthly rent', fm(rentMo) + (N(rentOverride) > 0 ? ' (estimated)' : rentBasis === 'market' ? ' (market)' : ''), true)}
                  {row('Property taxes ÷ 12', fm(taxMo))}
                  {row('Insurance ÷ 12', fm(insMo))}
                  {row('HOA dues', fm(hoaMo))}
                  {row('Taxes + Insurance + HOA', fm(taxMo + insMo + hoaMo), true)}
                  <div className='lbl-muted' style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '10px', lineHeight: 1.5 }}>DSCR = gross rent ÷ (your P&amp;I + taxes + insurance + HOA). Apply your proposed rate &amp; term to compute P&amp;I and the resulting DSCR.</div>
                </div>
              )}

              {/* loan request */}
              <div className='dscr-card' style={card}>
                <div style={sec}>Loan Request</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px' }}>
                  {fact('Purpose', purposeLabel)}
                  {fact('Estimated value', fm(value))}
                  {fact('Requested loan', fm(loan))}
                  {fact('LTV', ltv != null ? ltv.toFixed(0) + '%' : '—')}
                  {includeTerms ? fact('Rate', (N(rate)).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + '%') : <></>}
                  {includeTerms ? fact('Amortization', io ? 'Interest-only' : N(term) + ' yr') : <></>}
                  {includeTerms && N(orig) > 0 ? fact('Origination fee', fm(origFee) + ' (' + N(orig) + '%)') : <></>}
                </div>
              </div>

              {/* property details */}
              {!isManual && (
              <div className='dscr-card' style={card}>
                <div style={sec}>Property</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '10px' }}>
                  {fact('Type', (sel.type || '—').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()))}
                  {fact('Units', String(sel.num_units || 1))}
                  {sel.bedrooms ? fact('Beds / Baths', sel.bedrooms + ' / ' + (sel.bathrooms || '—')) : <></>}
                  {sel.sqft ? fact('Sq Ft', sel.sqft.toLocaleString()) : <></>}
                  {sel.year_built ? fact('Year Built', String(sel.year_built)) : <></>}
                  {fact('Occupancy', sel.occupancy_status === 'occupied' ? 'Occupied' : 'Vacant')}
                </div>
              </div>
              )}

              {/* income detail */}
              {!isManual && (
              <div className='dscr-card' style={card}>
                <div style={sec}>Income</div>
                {propLeases.length > 0 ? (
                  <>
                    {propLeases.map((l: any, i: number) => row((l.tenants?.full_name || 'Tenant') + (l.end_date ? ' · lease thru ' + new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''), fm(l.rent_amount) + '/mo'))}
                    {row('Gross scheduled rent', fm(inPlaceRent) + '/mo · ' + fm(inPlaceRent * 12) + '/yr', true)}
                  </>
                ) : (
                  <>
                    {row('In-place lease', 'None (vacant)')}
                    {marketRent > 0 && row('Estimated market rent', fm(marketRent) + '/mo · ' + fm(marketRent * 12) + '/yr', true)}
                  </>
                )}
                {rentBasis === 'market' && marketRent > 0 && <div className='lbl-muted' style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>DSCR above uses estimated market rent ({fm(marketRent)}/mo). Lenders may underwrite to the lower of market or in-place rent.</div>}
              </div>
              )}

              {/* existing financing */}
              {mtg && (
                <div className='dscr-card' style={card}>
                  <div style={sec}>Existing Financing</div>
                  {row('Lender', mtg.lender_name || '—')}
                  {row('Original amount', fm(mtg.original_amount))}
                  {row('Current balance', fm(mtg.interest_only ? (mtg.original_amount || mtg.current_balance) : mtg.current_balance))}
                  {row('Rate / term', (mtg.interest_rate || 0) + '% · ' + (mtg.term_years || '—') + 'yr' + (mtg.interest_only ? ' · interest-only' : ''))}
                  {mtg.balloon_date && row('Balloon / maturity', new Date(mtg.balloon_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))}
                </div>
              )}

              <div className='lbl-muted' style={{ fontSize: '10.5px', color: 'var(--text3)', lineHeight: 1.6, padding: '0 4px' }}>
                Prepared from owner records for lender review. DSCR = gross monthly rent ÷ PITIA (principal, interest, taxes, insurance, HOA). Figures are estimates and subject to lender verification, third-party appraisal, and final underwriting. Not a loan commitment.
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
