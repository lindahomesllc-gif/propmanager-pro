'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, monthlyPI, loanBalance } from '@/lib/supabase'
import StrategyFlow from '@/components/StrategyFlow'

// plain-English guide (same "know these numbers" concept as Reports)
const GLOSSARY = [
  { k: 'Total Payment (PITI)', what: 'Your full monthly payment — principal, interest, taxes & insurance.', good: "The number lenders qualify against — not just P&I.", use: 'The real monthly cost of the loan; compare it to rent for true coverage.' },
  { k: 'DSCR (lender)', what: 'Monthly rent ÷ the full payment (PITI).', good: '≥1.20–1.25x is what DSCR lenders want; below 1.0 the rent doesn’t cover the payment.', use: 'How a DSCR loan gets approved. Higher = easier approval and better terms.' },
  { k: 'Net cash to you', what: 'Cash-out − closing costs — what you actually pocket from a refi.', good: 'Positive; the new loan pays off any old loan first.', use: 'Tax-free cash to redeploy (it’s a loan, not income).' },
  { k: 'Loan-to-Value (LTV)', what: 'New loan ÷ property value.', good: 'Cash-out refis on rentals usually cap around 70–75%.', use: 'Over ~75% and most lenders won’t do the cash-out — keep it under.' },
  { k: 'Post-refi ROI (cash-on-cash)', what: 'New cash flow ÷ the cash still left in the deal after the cash-out.', good: '“♾ all capital back” means you pulled out everything and still cash-flow.', use: 'The whole point of a cash-out / BRRRR — recycle your capital so the return on remaining cash soars.' },
  { k: 'Break-even on costs', what: 'Months for the monthly savings to repay your closing costs.', good: 'Shorter is better — you keep the savings after that.', use: 'Hold the property longer than the break-even or the refi won’t pay off.' },
  { k: 'After-tax cash from sale', what: 'Sale price − selling costs − loan payoff − estimated tax (depreciation recapture + capital gains).', good: 'Compare it to what holding would earn.', use: 'The honest “cash in hand if I sell today” number.' },
  { k: 'Hold benefit', what: 'Cumulative cash flow + appreciation over your chosen years (loan paydown not shown).', good: 'Beats the after-tax sale figure? Holding likely wins.', use: 'Sell-now cash vs earn-over-time — the core of the sell-vs-hold call.' },
]

// Scenario Modeler — refinance and sell-vs-hold analysis for a single property,
// prefilled from its value, loan, rent and expenses. Planning estimates, not advice.
export default function ModelerPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [mortgages, setMortgages] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  // refinance inputs
  const [newRate, setNewRate] = useState('')
  const [newTerm, setNewTerm] = useState('30')
  const [cashOut, setCashOut] = useState('0')
  const [closing, setClosing] = useState('6000')
  const [closingMode, setClosingMode] = useState<'amount' | 'pct'>('amount')
  const [closingPct, setClosingPct] = useState('3')
  const [taxMo, setTaxMo] = useState('')   // monthly property tax (escrow)
  const [insMo, setInsMo] = useState('')   // monthly insurance (escrow)
  // sell inputs
  const [salePrice, setSalePrice] = useState('')
  const [sellCostPct, setSellCostPct] = useState('6')
  const [accumDep, setAccumDep] = useState('0')
  const [improvements, setImprovements] = useState('0')
  const [ltcgRate, setLtcgRate] = useState('15')
  const [apprPct, setApprPct] = useState('3')
  const [holdYears, setHoldYears] = useState('5')

  useEffect(() => {
    Promise.all([
      supabase.from('properties').select('id, address, market_value, purchase_price, annual_tax, insurance_premium, cash_invested'),
      supabase.from('mortgages').select('*').eq('is_paid_off', false),
      supabase.from('leases').select('property_id, rent_amount, status').eq('status', 'executed'),
      supabase.from('expenses').select('property_id, amount, expense_date'),
      supabase.from('property_assets').select('property_id, cost'),
    ]).then(([p, m, l, e, a]) => {
      const props = p.data || []
      setProperties(props); setMortgages(m.data || []); setLeases(l.data || []); setExpenses(e.data || []); setAssets(a.data || [])
      if (props.length) { const qp = new URLSearchParams(window.location.search).get('property'); setSelId(qp && props.find((x: any) => x.id === qp) ? qp : props[0].id) }
      setLoading(false)
    })
  }, [])

  const sel = properties.find(p => p.id === selId)
  const mtg = mortgages.find(m => m.property_id === selId)

  // prefill scenario inputs when the property changes
  useEffect(() => {
    if (!sel) return
    setSalePrice(sel.market_value ? String(sel.market_value) : '')
    setNewRate(mtg?.interest_rate ? String(mtg.interest_rate) : '')
    setCashOut('0')
    setTaxMo(sel.annual_tax ? (Math.round(sel.annual_tax / 12 * 100) / 100).toString() : '')
    setInsMo(sel.insurance_premium ? (Math.round(sel.insurance_premium / 12 * 100) / 100).toString() : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, properties.length])

  // prefill Capital Improvements from logged appliance/system costs (editable)
  const improvementsFromAssets = assets.filter(a => a.property_id === selId).reduce((s, a) => s + (a.cost || 0), 0)
  useEffect(() => {
    if (selId) setImprovements(String(Math.round(improvementsFromAssets)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, assets.length])

  const yr = String(new Date().getFullYear())
  const annualRent = leases.filter(l => l.property_id === selId).reduce((s, l) => s + (l.rent_amount || 0), 0) * 12
  const annualExp = expenses.filter(e => e.property_id === selId && e.expense_date?.startsWith(yr)).reduce((s, e) => s + (e.amount || 0), 0)
  const noi = annualRent - annualExp
  const value = sel?.market_value || 0
  const basis = sel?.purchase_price || 0
  const balance = mtg ? loanBalance(mtg) : 0
  const curPI = mtg ? monthlyPI(mtg) : 0
  const curAnnualDebt = curPI * 12
  const curCashFlow = noi - curAnnualDebt
  const curDSCR = curAnnualDebt > 0 ? noi / curAnnualDebt : null
  const equity = value - balance

  // refinance
  const nLoan = balance + (parseFloat(cashOut) || 0)
  const nPI = monthlyPI({ original_amount: nLoan, interest_rate: parseFloat(newRate) || 0, term_years: parseFloat(newTerm) || 30 })
  const nAnnualDebt = nPI * 12
  const nCashFlow = noi - nAnnualDebt
  const nDSCR = nAnnualDebt > 0 ? noi / nAnnualDebt : null
  const monthlyDelta = nPI - curPI // + = pay more
  const monthlySavings = curPI - nPI
  const closingCost = closingMode === 'pct' ? nLoan * (parseFloat(closingPct) || 0) / 100 : (parseFloat(closing) || 0)
  const breakeven = monthlySavings > 0 ? closingCost / monthlySavings : null
  // full payment + lender (DSCR-loan) ratio: gross rent ÷ PITI
  const escrowMo = (parseFloat(taxMo) || 0) + (parseFloat(insMo) || 0)
  const pitiMo = nPI + escrowMo
  const monthlyRent = annualRent / 12
  const lenderDSCR = pitiMo > 0 ? monthlyRent / pitiMo : null
  // cash-out: new loan pays off any existing balance; net cash = cash-out − closing costs
  const netCashOut = (parseFloat(cashOut) || 0) - closingCost
  const newLTV = value > 0 ? (nLoan / value) * 100 : null
  // post-refi cash-on-cash ROI: a cash-out returns your capital → ROI on what's left in
  const cashInvested = sel?.cash_invested || 0
  const cashLeftInDeal = cashInvested - netCashOut
  const allRecovered = cashInvested > 0 && cashLeftInDeal <= 0
  const postRoi = cashInvested > 0 && cashLeftInDeal > 0 ? (nCashFlow / cashLeftInDeal) * 100 : null

  // sell
  const gross = parseFloat(salePrice) || 0
  const sCosts = gross * (parseFloat(sellCostPct) || 0) / 100
  const netProceeds = gross - sCosts - balance
  const dep = parseFloat(accumDep) || 0
  const adjBasis = basis + (parseFloat(improvements) || 0) - dep
  const totalGain = (gross - sCosts) - adjBasis
  const recapture = Math.max(0, Math.min(dep, totalGain))
  const ltcgGain = Math.max(0, totalGain - recapture)
  const estTax = recapture * 0.25 + ltcgGain * ((parseFloat(ltcgRate) || 0) / 100)
  const afterTax = netProceeds - estTax
  // hold
  const hy = parseFloat(holdYears) || 0
  const futureValue = value * Math.pow(1 + (parseFloat(apprPct) || 0) / 100, hy)
  const apprGain = futureValue - value
  const cumCashFlow = curCashFlow * hy
  const holdBenefit = cumCashFlow + apprGain

  // --- Recommendation: Refinance & Hold vs Hold vs Sell ---
  const refiEntered = (parseFloat(newRate) || 0) > 0
  const refiHelpful = refiEntered && (parseFloat(cashOut) || 0) > 0 && netCashOut > 0 && nCashFlow >= 0 && (lenderDSCR == null || lenderDSCR >= 1.2) && (newLTV == null || newLTV <= 78)
  const holdWins = holdBenefit > afterTax
  let recVerdict = 'Hold', recColor = 'var(--green)', recWhy = ''
  if (refiHelpful && holdBenefit > 0) {
    recVerdict = 'Refinance & Hold'; recColor = 'var(--blue)'
    recWhy = `Pull ${fm(netCashOut)} tax-free now while DSCR stays ${lenderDSCR != null ? '~' + lenderDSCR.toFixed(2) + 'x' : 'healthy'} and it still cash-flows ${fm(nCashFlow)}/yr — and keep the ~${fm(holdBenefit)} you'd earn over ${hy} years. You get the cash and keep the asset.`
  } else if (holdWins) {
    recVerdict = 'Hold'; recColor = 'var(--green)'
    recWhy = `Holding earns ~${fm(holdBenefit)} over ${hy} years vs ${fm(afterTax)} after-tax cash from selling now${curCashFlow < 0 ? ' — though watch the negative cash flow' : ''}.`
  } else {
    recVerdict = 'Sell'; recColor = 'var(--amber)'
    recWhy = `Selling nets ${fm(afterTax)} after tax now — ahead of the ~${fm(holdBenefit)} you'd earn holding ${hy} years. Cash out and redeploy into a stronger deal.`
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px 20px' }
  const secLabel = { fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }
  const row = (label: string, val: string, color = 'var(--text)', strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
      <span style={{ color: 'var(--text2)' }}>{label}</span><span style={{ color, fontWeight: strong ? 700 : 600 }}>{val}</span>
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🧮 Scenario Modeler</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => window.print()} className='btn btn-ghost no-print'>🖨 PDF</button>
          {properties.length > 0 && (
            <select value={selId} onChange={e => setSelId(e.target.value)} style={{ ...inp, width: 'auto', minWidth: '220px' }}>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <StrategyFlow step={2} propertyId={selId} />
        {loading ? (
          <div style={{ display: 'grid', gap: '14px' }}><div className='skeleton' style={{ height: '80px' }} /><div className='skeleton' style={{ height: '260px' }} /></div>
        ) : !sel ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text3)' }}>Add a property first.</div>
        ) : (
          <>
            {/* current snapshot */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '10px', marginBottom: '22px' }}>
              {[
                ['Value', fm(value), 'var(--text)'],
                ['Loan Balance', fm(balance), 'var(--red)'],
                ['Equity', fm(equity), 'var(--green)'],
                ['Annual NOI', fm(noi), 'var(--text)'],
                ['Cash Flow', fm(curCashFlow), curCashFlow >= 0 ? 'var(--green)' : 'var(--red)'],
                ['DSCR', curDSCR != null ? curDSCR.toFixed(2) + 'x' : '—', 'var(--text)'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={lbl}>{l}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: c as string, marginTop: '4px' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px,1fr))', gap: '16px' }}>
              {/* REFINANCE */}
              <div style={card}>
                <div style={secLabel}>♻️ Refinance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div><label style={lbl}>New Rate %</label><input style={inp} type='number' step='0.001' value={newRate} onChange={e => setNewRate(e.target.value)} /></div>
                  <div><label style={lbl}>New Term (yrs)</label><input style={inp} type='number' value={newTerm} onChange={e => setNewTerm(e.target.value)} /></div>
                  <div><label style={lbl}>Cash-Out</label><input style={inp} type='number' value={cashOut} onChange={e => setCashOut(e.target.value)} /></div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={lbl}>Closing Costs</label>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                        {(['amount', 'pct'] as const).map(m => (
                          <button key={m} onClick={() => setClosingMode(m)} style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '5px', border: '0.5px solid var(--border2)', cursor: 'pointer', background: closingMode === m ? 'var(--green)' : 'transparent', color: closingMode === m ? '#fff' : 'var(--text3)', fontWeight: closingMode === m ? 700 : 400 }}>{m === 'amount' ? '$' : '% of loan'}</button>
                        ))}
                      </div>
                    </div>
                    {closingMode === 'amount'
                      ? <input style={inp} type='number' value={closing} onChange={e => setClosing(e.target.value)} />
                      : <input style={inp} type='number' step='0.1' value={closingPct} onChange={e => setClosingPct(e.target.value)} />}
                    {closingMode === 'pct' && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>= {fm(closingCost)} of {fm(nLoan)}</div>}
                  </div>
                  <div><label style={lbl}>Property Tax /mo</label><input style={inp} type='number' value={taxMo} onChange={e => setTaxMo(e.target.value)} /></div>
                  <div><label style={lbl}>Insurance /mo</label><input style={inp} type='number' value={insMo} onChange={e => setInsMo(e.target.value)} /></div>
                </div>
                <div style={{ marginTop: '6px' }}>
                  {row('New loan amount', fm(nLoan))}
                  {row('Pays off current loan', balance > 0 ? '−' + fm(balance) : fm(0), 'var(--text2)')}
                  {row('New loan-to-value', newLTV != null ? newLTV.toFixed(0) + '%' : '—', newLTV != null && newLTV > 75 ? 'var(--red)' : 'var(--text2)')}
                  {row('Current P&I', fm(curPI) + '/mo', 'var(--text2)')}
                  {row('New P&I', fm(nPI) + '/mo', 'var(--text)', true)}
                  {row('+ Taxes & insurance', fm(escrowMo) + '/mo', 'var(--text2)')}
                  {row('Total payment (PITI)', fm(pitiMo) + '/mo', 'var(--text)', true)}
                  {row(monthlyDelta <= 0 ? 'Monthly savings (P&I)' : 'Monthly increase (P&I)', fm(Math.abs(monthlyDelta)) + '/mo', monthlyDelta <= 0 ? 'var(--green)' : 'var(--red)', true)}
                  {row('New cash flow', fm(nCashFlow) + '/yr', nCashFlow >= 0 ? 'var(--green)' : 'var(--red)')}
                  {row('DSCR — lender (rent ÷ PITI)', lenderDSCR != null ? lenderDSCR.toFixed(2) + 'x' : '—', lenderDSCR != null ? (lenderDSCR >= 1.25 ? 'var(--green)' : lenderDSCR >= 1.0 ? 'var(--amber)' : 'var(--red)') : 'var(--text)', true)}
                  {row('Closing costs', fm(closingCost), 'var(--amber)')}
                  {row('💵 Net cash to you', fm(netCashOut), netCashOut >= 0 ? 'var(--green)' : 'var(--red)', true)}
                  {cashInvested > 0 && row('Cash left in deal', fm(Math.max(0, cashLeftInDeal)), 'var(--text2)')}
                  {cashInvested > 0 && row('Post-refi ROI (cash-on-cash)', allRecovered ? '♾ all capital back' : (postRoi != null ? postRoi.toFixed(0) + '%' : '—'), allRecovered ? 'var(--green)' : 'var(--text)', true)}
                  {row('Break-even on costs', breakeven != null ? Math.ceil(breakeven) + ' months' : '—', 'var(--text2)')}
                </div>
              </div>

              {/* SELL vs HOLD */}
              <div style={card}>
                <div style={secLabel}>🏷️ Sell vs. Hold</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div><label style={lbl}>Sale Price</label><input style={inp} type='number' value={salePrice} onChange={e => setSalePrice(e.target.value)} /></div>
                  <div><label style={lbl}>Selling Cost %</label><input style={inp} type='number' step='0.1' value={sellCostPct} onChange={e => setSellCostPct(e.target.value)} /></div>
                  <div><label style={lbl}>Accum. Depreciation</label><input style={inp} type='number' value={accumDep} onChange={e => setAccumDep(e.target.value)} /></div>
                  <div><label style={lbl}>Capital Improvements</label><input style={inp} type='number' value={improvements} onChange={e => setImprovements(e.target.value)} />{improvementsFromAssets > 0 && <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>Pulled from your logged appliances/systems ({fm(improvementsFromAssets)}). Add other improvements (roof, renos…).</div>}</div>
                  <div><label style={lbl}>Cap-Gains Rate %</label><input style={inp} type='number' value={ltcgRate} onChange={e => setLtcgRate(e.target.value)} /></div>
                </div>
                <div style={{ marginTop: '6px' }}>
                  {row('Gross sale price', fm(gross))}
                  {row('Selling costs', '−' + fm(sCosts), 'var(--amber)')}
                  {row('Loan payoff', '−' + fm(balance), 'var(--amber)')}
                  {row('Net proceeds (cash)', fm(netProceeds), 'var(--text)', true)}
                  {row('Est. tax (recapture + gains)', '−' + fm(estTax), 'var(--red)')}
                  {row('After-tax cash from sale', fm(afterTax), afterTax >= 0 ? 'var(--green)' : 'var(--red)', true)}
                </div>
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '0.5px dashed var(--border2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>If you hold</span>
                    <input style={{ ...inp, width: '54px', padding: '4px 6px' }} type='number' value={holdYears} onChange={e => setHoldYears(e.target.value)} />
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>years at</span>
                    <input style={{ ...inp, width: '54px', padding: '4px 6px' }} type='number' step='0.5' value={apprPct} onChange={e => setApprPct(e.target.value)} />
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>% appreciation</span>
                  </div>
                  {row('Cumulative cash flow', fm(cumCashFlow), cumCashFlow >= 0 ? 'var(--green)' : 'var(--red)')}
                  {row('Appreciation gain', fm(apprGain), 'var(--green)')}
                  {row('Hold benefit (' + (hy || 0) + 'yr)', fm(holdBenefit), 'var(--text)', true)}
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>…plus loan paydown (equity build) not shown. Compare <strong>{fm(afterTax)}</strong> in hand now vs <strong>{fm(holdBenefit)}</strong> earned over {hy || 0} years.</div>
                </div>
              </div>
            </div>

            {/* RECOMMENDATION */}
            <div style={{ ...card, borderColor: recColor, marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>💡 Recommendation</div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', background: recColor, borderRadius: '20px', padding: '4px 14px' }}>{recVerdict}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.55, marginBottom: '12px' }}>{recWhy}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { t: '♻️ Refinance', a: refiEntered ? fm(netCashOut) + ' cash' : 'enter a rate →', b: refiEntered && lenderDSCR != null ? 'DSCR ' + lenderDSCR.toFixed(2) + 'x · CF ' + fm(nCashFlow) + '/yr' : 'model a refi above' },
                  { t: '⏳ Hold ' + (hy || 0) + 'yr', a: fm(holdBenefit), b: 'cash flow + appreciation' },
                  { t: '🏷️ Sell now', a: fm(afterTax), b: 'after-tax cash' },
                ].map(o => (
                  <div key={o.t} style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600 }}>{o.t}</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne, sans-serif', marginTop: '3px' }}>{o.a}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>{o.b}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                {(() => { const cash = Math.round(recVerdict === 'Sell' ? afterTax : Math.max(0, netCashOut)); return cash > 0 ? <a href={'/deploy?capital=' + cash} className='btn btn-primary no-print'>🌱 Plan next move with this {fm(cash)} →</a> : <a href='/deploy' className='btn btn-ghost no-print'>🌱 Plan next move →</a> })()}
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Take the freed-up cash to the Deployment Planner.</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '10px' }}>Directional guide from the numbers above — “Hold” compares total earned over your hold window vs cash in hand now; “Refinance &amp; Hold” appears when a cash-out keeps DSCR healthy. Confirm with your CPA &amp; lender.</div>
            </div>

            {/* New-investor guide — same look as Reports */}
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
            <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6, maxWidth: '700px', marginTop: '14px' }}>
              <strong>How these are figured:</strong> NOI = in-place rent (active leases ×12) − this year&apos;s logged expenses; P&amp;I is principal &amp; interest only (escrow excluded). Sale tax is a rough estimate — depreciation recapture at 25% + your cap-gains rate on the remaining gain. <strong>Planning estimates only — confirm with your CPA &amp; lender.</strong>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
