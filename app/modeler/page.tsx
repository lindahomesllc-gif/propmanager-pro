'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, monthlyPI } from '@/lib/supabase'

// Scenario Modeler — refinance and sell-vs-hold analysis for a single property,
// prefilled from its value, loan, rent and expenses. Planning estimates, not advice.
export default function ModelerPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [mortgages, setMortgages] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState('')

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
      supabase.from('properties').select('id, address, market_value, purchase_price, annual_tax, insurance_premium'),
      supabase.from('mortgages').select('*').eq('is_paid_off', false),
      supabase.from('leases').select('property_id, rent_amount, status').eq('status', 'executed'),
      supabase.from('expenses').select('property_id, amount, expense_date'),
    ]).then(([p, m, l, e]) => {
      const props = p.data || []
      setProperties(props); setMortgages(m.data || []); setLeases(l.data || []); setExpenses(e.data || [])
      if (props.length) setSelId(props[0].id)
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

  const yr = String(new Date().getFullYear())
  const annualRent = leases.filter(l => l.property_id === selId).reduce((s, l) => s + (l.rent_amount || 0), 0) * 12
  const annualExp = expenses.filter(e => e.property_id === selId && e.expense_date?.startsWith(yr)).reduce((s, e) => s + (e.amount || 0), 0)
  const noi = annualRent - annualExp
  const value = sel?.market_value || 0
  const basis = sel?.purchase_price || 0
  const balance = mtg?.current_balance || 0
  const curPI = mtg ? monthlyPI({ original_amount: mtg.original_amount, interest_rate: mtg.interest_rate, term_years: mtg.term_years }) : 0
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
        {properties.length > 0 && (
          <select value={selId} onChange={e => setSelId(e.target.value)} style={{ ...inp, width: 'auto', minWidth: '220px' }}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
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
                  {row('Break-even on costs', breakeven != null ? Math.ceil(breakeven) + ' months' : '—', 'var(--text2)')}
                  <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.55, marginTop: '10px', background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px' }}>
                    <strong>What&apos;s DSCR?</strong> Monthly rent ÷ the full payment (PITI). <strong>{lenderDSCR != null ? lenderDSCR.toFixed(2) + 'x' : '—'}</strong> means rent covers the payment{lenderDSCR != null ? ' ' + lenderDSCR.toFixed(2) + '×' : ''} over. <strong>DSCR lenders typically want ≥ 1.20–1.25x</strong>; below 1.0 means rent doesn&apos;t cover the payment. Higher = easier approval &amp; better terms.
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.55, marginTop: '8px', background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px' }}>
                    💵 <strong>Net cash to you</strong> = cash-out − closing costs. The new loan pays off any existing loan first; on a free-and-clear property (like Ridgewood) the whole new loan is yours, minus closing. Cash-out refis on rentals usually max out around <strong>70–75% loan-to-value</strong> — watch the LTV line above.
                  </div>
                </div>
              </div>

              {/* SELL vs HOLD */}
              <div style={card}>
                <div style={secLabel}>🏷️ Sell vs. Hold</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div><label style={lbl}>Sale Price</label><input style={inp} type='number' value={salePrice} onChange={e => setSalePrice(e.target.value)} /></div>
                  <div><label style={lbl}>Selling Cost %</label><input style={inp} type='number' step='0.1' value={sellCostPct} onChange={e => setSellCostPct(e.target.value)} /></div>
                  <div><label style={lbl}>Accum. Depreciation</label><input style={inp} type='number' value={accumDep} onChange={e => setAccumDep(e.target.value)} /></div>
                  <div><label style={lbl}>Capital Improvements</label><input style={inp} type='number' value={improvements} onChange={e => setImprovements(e.target.value)} /></div>
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

            <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6, maxWidth: '700px', marginTop: '20px' }}>
              <strong>Notes:</strong> NOI uses in-place rent (active leases ×12) minus this year&apos;s logged expenses; P&amp;I is principal &amp; interest only (escrow excluded). Tax is a rough estimate — depreciation recapture at 25% plus your cap-gains rate on the remaining gain. Enter your accumulated depreciation and improvements for accuracy. <strong>Planning estimates only — confirm with your CPA and lender.</strong>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
