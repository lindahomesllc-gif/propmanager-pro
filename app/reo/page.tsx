'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, monthlyPI, loanBalance } from '@/lib/supabase'

// Schedule of Real Estate Owned (REO) — the portfolio-wide list a bank asks for on a
// loan application / personal financial statement. Lists every property (rentals, your
// residence, lots) with value, debt, equity, rent and payment, plus totals. Prints light.
const typeLabel = (t: string) => ({ single_family: 'Single Family', condo: 'Condo', duplex: 'Duplex', triplex: 'Triplex', quadplex: 'Quadplex', multi_family: 'Multi-Family', commercial: 'Commercial', land: 'Land / Lot', primary_residence: 'Primary Residence' }[t] || (t || 'Property').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()))

export default function ReoPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [mortgages, setMortgages] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [borrower, setBorrower] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('properties').select('id, address, city, state, zip, type, occupancy_status, market_value, purchase_price, owner_entity, entity_id, ownership_percentage'),
      supabase.from('mortgages').select('*').eq('is_paid_off', false),
      supabase.from('leases').select('property_id, rent_amount').eq('status', 'executed'),
      supabase.from('entities').select('id, name'),
    ]).then(([p, m, l, e]) => {
      setProperties(p.data || []); setMortgages(m.data || []); setLeases(l.data || []); setEntities(e.data || [])
      setLoading(false)
    })
  }, [])

  const rentBy = (id: string) => leases.filter(l => l.property_id === id).reduce((s, l) => s + (l.rent_amount || 0), 0)
  const debtBy = (id: string) => mortgages.filter(m => m.property_id === id).reduce((s, m) => s + loanBalance(m), 0)
  const payBy = (id: string) => mortgages.filter(m => m.property_id === id).reduce((s, m) => s + (m.monthly_payment || monthlyPI(m)), 0)
  const ownerOf = (p: any) => (entities.find(e => e.id === p.entity_id)?.name || p.owner_entity || 'Self') + (p.ownership_percentage != null && p.ownership_percentage < 100 ? ' (' + p.ownership_percentage + '%)' : '')

  const rows = properties.map(p => {
    const value = p.market_value || p.purchase_price || 0
    const debt = debtBy(p.id)
    return { p, value, debt, equity: value - debt, rent: rentBy(p.id), pay: payBy(p.id) }
  }).sort((a, b) => b.value - a.value)
  const tot = rows.reduce((t, r) => ({ value: t.value + r.value, debt: t.debt + r.debt, equity: t.equity + r.equity, rent: t.rent + r.rent, pay: t.pay + r.pay }), { value: 0, debt: 0, equity: 0, rent: 0, pay: 0 })
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const inp: any = { padding: '7px 9px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }
  const th: any = { padding: '8px 10px', fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '0.5px solid var(--border)' }
  const thL: any = { ...th, textAlign: 'left' }
  const td: any = { padding: '8px 10px', fontSize: '11.5px', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }
  const tdL: any = { ...td, textAlign: 'left' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🏦 Schedule of Real Estate Owned</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input className='no-print' placeholder='Borrower / your name' value={borrower} onChange={e => setBorrower(e.target.value)} style={{ ...inp, width: '200px' }} />
          <button onClick={() => window.print()} className='btn btn-primary no-print'>🖨 Save as PDF</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? <div className='skeleton' style={{ height: '300px' }} /> : (
          <div className='reo-doc'>
            <div className='reo-card' style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px 22px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Schedule of Real Estate Owned</div>
                  {borrower && <div style={{ fontSize: '14px', color: 'var(--text)', marginTop: '6px', fontWeight: 600 }}>{borrower}</div>}
                </div>
                <div className='lbl-muted' style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'right' }}>Prepared {today}<br />{rows.length} propert{rows.length === 1 ? 'y' : 'ies'}</div>
              </div>
            </div>

            <div className='reo-card' style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead>
                  <tr>
                    <th style={thL}>Property</th>
                    <th style={thL}>Type</th>
                    <th style={thL}>Owner</th>
                    <th style={th}>Market Value</th>
                    <th style={th}>Loan Balance</th>
                    <th style={th}>Equity</th>
                    <th style={th}>Rent /mo</th>
                    <th style={th}>Payment /mo</th>
                    <th style={thL}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ p, value, debt, equity, rent, pay }) => (
                    <tr key={p.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                      <td style={tdL}><div style={{ fontWeight: 600 }}>{p.address}</div><div className='lbl-muted' style={{ fontSize: '10px', color: 'var(--text3)' }}>{p.city}{p.city ? ', ' : ''}{p.state} {p.zip}</div></td>
                      <td style={tdL}>{typeLabel(p.type)}</td>
                      <td style={tdL}>{ownerOf(p)}</td>
                      <td style={td}>{fm(value)}</td>
                      <td style={{ ...td, color: 'var(--red)' }}>{debt > 0 ? fm(debt) : '—'}</td>
                      <td style={{ ...td, color: equity >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fm(equity)}</td>
                      <td style={{ ...td, color: rent > 0 ? 'var(--green)' : 'var(--text3)' }}>{rent > 0 ? fm(rent) : '—'}</td>
                      <td style={td}>{pay > 0 ? fm(pay) : '—'}</td>
                      <td style={tdL}>{p.type === 'primary_residence' ? 'Residence' : p.type === 'land' ? 'Land' : (p.occupancy_status === 'occupied' ? 'Rented' : 'Vacant')}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--bg3)' }} className='reo-box'>
                    <td style={{ ...tdL, fontWeight: 800 }}>TOTAL</td>
                    <td style={tdL}></td>
                    <td style={tdL}></td>
                    <td style={{ ...td, fontWeight: 800 }}>{fm(tot.value)}</td>
                    <td style={{ ...td, fontWeight: 800, color: 'var(--red)' }}>{fm(tot.debt)}</td>
                    <td style={{ ...td, fontWeight: 800, color: 'var(--green)' }}>{fm(tot.equity)}</td>
                    <td style={{ ...td, fontWeight: 800, color: 'var(--green)' }}>{fm(tot.rent)}</td>
                    <td style={{ ...td, fontWeight: 800 }}>{fm(tot.pay)}</td>
                    <td style={tdL}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className='lbl-muted' style={{ fontSize: '10.5px', color: 'var(--text3)', lineHeight: 1.6, padding: '8px 4px 0' }}>
              Prepared from owner records. Market values are owner estimates; loan balances reflect the amount owed (interest-only loans show the full note). Rent is in-place scheduled rent. Subject to verification and appraisal. {rows.some(r => r.p.type === 'land' || r.p.type === 'primary_residence') ? '' : 'Tip: add your primary residence and any lots (Properties → Add Property → choose “Primary Residence” or “Land / Lot”) so the schedule is complete.'}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
