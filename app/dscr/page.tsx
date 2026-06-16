'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, monthlyPI } from '@/lib/supabase'

// DSCR Loan Package — a print-ready, lender-facing summary for a single property.
// A DSCR lender qualifies on rent ÷ PITIA (P&I + taxes + insurance + HOA), so that
// calculation is the headline; the rest is the supporting property + income detail.
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
  const [rentBasis, setRentBasis] = useState('inplace') // inplace | market
  const [rentOverride, setRentOverride] = useState('')   // manual market/appraised rent for un-leased deals

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qp = params.get('property')
    Promise.all([
      supabase.from('properties').select('id, address, city, state, zip, type, num_units, bedrooms, bathrooms, sqft, year_built, occupancy_status, market_value, purchase_price, annual_tax, insurance_premium, hoa, hoa_fee, hoa_name, owner_entity, entity_id'),
      supabase.from('mortgages').select('*').eq('is_paid_off', false),
      supabase.from('leases').select('property_id, rent_amount, start_date, end_date, status, tenants(full_name)').eq('status', 'executed'),
      supabase.from('units').select('property_id, market_rent, label'),
      supabase.from('entities').select('id, name'),
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

  const value = sel?.market_value || sel?.purchase_price || 0
  const inPlaceRent = leases.filter(l => l.property_id === selId).reduce((s, l) => s + (l.rent_amount || 0), 0)
  const marketRent = units.filter(u => u.property_id === selId).reduce((s, u) => s + (u.market_rent || 0), 0)
  const rentMo = N(rentOverride) > 0 ? N(rentOverride) : (rentBasis === 'market' ? (marketRent || inPlaceRent) : (inPlaceRent || marketRent))
  const loan = N(loanAmt)
  const pi = io ? loan * (N(rate) / 100 / 12) : monthlyPI({ original_amount: loan, interest_rate: N(rate), term_years: N(term) })
  const taxMo = (sel?.annual_tax || 0) / 12
  const insMo = (sel?.insurance_premium || 0) / 12
  const hoaMo = sel?.hoa ? (sel?.hoa_fee || 0) : 0
  const pitia = pi + taxMo + insMo + hoaMo
  const dscr = pitia > 0 ? rentMo / pitia : null
  const ltv = value > 0 ? loan / value * 100 : null
  const dscrColor = dscr == null ? '#888' : dscr >= 1.25 ? '#16a34a' : dscr >= 1 ? '#d97706' : '#dc2626'
  const dscrVerdict = dscr == null ? '—'
    : dscr >= 1.25 ? 'Strong — clears the 1.25× ratio most DSCR lenders prefer for best pricing.'
    : dscr >= 1 ? 'Qualifies — rent covers the payment (≥1.0×). Lenders price best at 1.25×+.'
    : 'Below 1.0× — rent does not fully cover the payment. Consider a lower loan amount or market rent if higher.'
  const propLeases = leases.filter(l => l.property_id === selId)
  const entityName = sel?.owner_entity || entities.find(e => e.id === sel?.entity_id)?.name || ''
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
          <button onClick={() => window.print()} className='btn btn-primary no-print'>🖨 Save as PDF</button>
          {properties.length > 0 && (
            <select value={selId} onChange={e => setSelId(e.target.value)} className='no-print' style={{ ...inp, width: 'auto', minWidth: '220px' }}>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? <div className='skeleton' style={{ height: '300px' }} /> : !sel ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text3)' }}>Add a property to build a package.</div>
        ) : (
          <>
            {/* loan scenario controls (not printed) */}
            <div className='no-print' style={{ ...card, borderColor: 'var(--green)' }}>
              <div style={sec}>Loan Scenario <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text3)' }}>· tune, then Save as PDF</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px' }}>
                <div><label style={lbl}>Purpose</label>
                  <select value={purpose} onChange={e => setPurpose(e.target.value)} style={inp}>
                    <option value='purchase'>Purchase</option>
                    <option value='refi'>Rate/term refinance</option>
                    <option value='cashout'>Cash-out refinance</option>
                  </select>
                </div>
                <div><label style={lbl}>Requested loan</label><input style={inp} value={loanAmt} onChange={e => setLoanAmt(e.target.value)} /></div>
                <div><label style={lbl}>Rate %</label><input style={inp} value={rate} onChange={e => setRate(e.target.value)} /></div>
                <div><label style={lbl}>Term (yrs)</label><input style={inp} value={term} onChange={e => setTerm(e.target.value)} /></div>
                <div><label style={lbl}>Rent basis</label>
                  <select value={rentBasis} onChange={e => setRentBasis(e.target.value)} style={inp} disabled={N(rentOverride) > 0}>
                    <option value='inplace'>In-place lease</option>
                    <option value='market'>Market rent</option>
                  </select>
                </div>
                <div><label style={lbl}>Rent override /mo</label><input style={inp} placeholder='if not leased' value={rentOverride} onChange={e => setRentOverride(e.target.value)} /></div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '7px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}>
                    <input type='checkbox' checked={io} onChange={e => setIo(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: 'var(--green)' }} /> Interest-only
                  </label>
                </div>
              </div>
            </div>

            {/* ===== The printable package ===== */}
            <div className='dscr-doc'>
              {/* document header */}
              <div className='dscr-card' style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>DSCR Loan Qualification Summary</div>
                    <div style={{ fontSize: '14px', color: 'var(--text)', marginTop: '6px', fontWeight: 600 }}>{sel.address}{sel.city ? ', ' + sel.city : ''} {sel.state} {sel.zip}</div>
                    {entityName && <div className='lbl-muted' style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>Borrowing entity: {entityName}</div>}
                  </div>
                  <div className='lbl-muted' style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'right' }}>Prepared {today}<br />{purposeLabel}</div>
                </div>
              </div>

              {/* DSCR headline */}
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

              {/* loan request */}
              <div className='dscr-card' style={card}>
                <div style={sec}>Loan Request</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px' }}>
                  {fact('Purpose', purposeLabel)}
                  {fact('Estimated value', fm(value))}
                  {fact('Requested loan', fm(loan))}
                  {fact('LTV', ltv != null ? ltv.toFixed(0) + '%' : '—')}
                  {fact('Rate', (N(rate)).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + '%')}
                  {fact('Amortization', io ? 'Interest-only' : N(term) + ' yr')}
                </div>
              </div>

              {/* property details */}
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

              {/* income detail */}
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
