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
  const [excluded, setExcluded] = useState<Set<string>>(new Set())  // property ids left off the report
  const [detail, setDetail] = useState<'full' | 'basic'>('full')    // full = values; basic = address/entity/type only
  const [groupBy, setGroupBy] = useState(true)                       // group rows under each entity
  const toggleProp = (id: string) => setExcluded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

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

  const allRows = properties.map(p => {
    const value = p.market_value || p.purchase_price || 0
    const debt = debtBy(p.id)
    return { p, value, debt, equity: value - debt, rent: rentBy(p.id), pay: payBy(p.id) }
  }).sort((a, b) => b.value - a.value)
  const rows = allRows.filter(r => !excluded.has(r.p.id))   // only the ones included on the report
  const subtotal = (rs: typeof rows) => rs.reduce((t, r) => ({ value: t.value + r.value, debt: t.debt + r.debt, equity: t.equity + r.equity, rent: t.rent + r.rent, pay: t.pay + r.pay }), { value: 0, debt: 0, equity: 0, rent: 0, pay: 0 })
  const tot = subtotal(rows)
  const groupName = (p: any) => entities.find(e => e.id === p.entity_id)?.name || p.owner_entity || 'Unassigned / Self'
  const groupMap = new Map<string, typeof rows>()
  rows.forEach(r => { const k = groupName(r.p); if (!groupMap.has(k)) groupMap.set(k, []); (groupMap.get(k) as any).push(r) })
  const groupNames = Array.from(groupMap.keys()).sort((a, b) => a === 'Unassigned / Self' ? 1 : b === 'Unassigned / Self' ? -1 : a.localeCompare(b))
  const colCount = (detail === 'full' ? 8 : 2) + (groupBy ? 0 : 1)   // Owner column only when not grouped
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const inp: any = { padding: '7px 9px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }
  const th: any = { padding: '8px 10px', fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '0.5px solid var(--border)' }
  const thL: any = { ...th, textAlign: 'left' }
  const td: any = { padding: '8px 10px', fontSize: '11.5px', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }
  const tdL: any = { ...td, textAlign: 'left' }
  const propRow = (r: any) => (
    <tr key={r.p.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
      <td style={tdL}><div style={{ fontWeight: 600 }}>{r.p.address}</div><div className='lbl-muted' style={{ fontSize: '10px', color: 'var(--text3)' }}>{r.p.city}{r.p.city ? ', ' : ''}{r.p.state} {r.p.zip}{r.p.ownership_percentage != null && r.p.ownership_percentage < 100 ? ' · ' + r.p.ownership_percentage + '% owned' : ''}</div></td>
      <td style={tdL}>{typeLabel(r.p.type)}</td>
      {!groupBy && <td style={tdL}>{ownerOf(r.p)}</td>}
      {detail === 'full' && <>
        <td style={td}>{fm(r.value)}</td>
        <td style={{ ...td, color: 'var(--red)' }}>{r.debt > 0 ? fm(r.debt) : '—'}</td>
        <td style={{ ...td, color: r.equity >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fm(r.equity)}</td>
        <td style={{ ...td, color: r.rent > 0 ? 'var(--green)' : 'var(--text3)' }}>{r.rent > 0 ? fm(r.rent) : '—'}</td>
        <td style={td}>{r.pay > 0 ? fm(r.pay) : '—'}</td>
        <td style={tdL}>{r.p.type === 'primary_residence' ? 'Residence' : r.p.type === 'land' ? 'Land' : (r.p.occupancy_status === 'occupied' ? 'Rented' : 'Vacant')}</td>
      </>}
    </tr>
  )
  const totalsRow = (label: string, t: any, key: string, bold = 800) => (
    <tr key={key} className='reo-box' style={{ background: 'var(--bg3)' }}>
      <td style={{ ...tdL, fontWeight: bold }}>{label}</td>
      <td style={tdL}></td>
      {!groupBy && <td style={tdL}></td>}
      {detail === 'full' && <>
        <td style={{ ...td, fontWeight: bold }}>{fm(t.value)}</td>
        <td style={{ ...td, fontWeight: bold, color: 'var(--red)' }}>{fm(t.debt)}</td>
        <td style={{ ...td, fontWeight: bold, color: 'var(--green)' }}>{fm(t.equity)}</td>
        <td style={{ ...td, fontWeight: bold, color: 'var(--green)' }}>{fm(t.rent)}</td>
        <td style={{ ...td, fontWeight: bold }}>{fm(t.pay)}</td>
        <td style={tdL}></td>
      </>}
    </tr>
  )

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
          <>
            {/* report options — not printed */}
            <div className='no-print' style={{ background: 'var(--bg2)', border: '0.5px solid var(--green)', borderRadius: '12px', padding: '16px 18px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>Report Options</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '8px', padding: '3px', border: '0.5px solid var(--border)' }}>
                    {([['full', 'Full (with values)'], ['basic', 'Address, entity & type only']] as const).map(([v, l]) => (
                      <button key={v} onClick={() => setDetail(v)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: detail === v ? 'var(--bg2)' : 'transparent', color: detail === v ? 'var(--text)' : 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontWeight: detail === v ? 600 : 400 }}>{l}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '8px', padding: '3px', border: '0.5px solid var(--border)' }}>
                    {([[true, '🏛 By entity'], [false, 'By value']] as const).map(([v, l]) => (
                      <button key={String(v)} onClick={() => setGroupBy(v)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: groupBy === v ? 'var(--bg2)' : 'transparent', color: groupBy === v ? 'var(--text)' : 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontWeight: groupBy === v ? 600 : 400 }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Include on report ({rows.length} of {allRows.length})</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setExcluded(new Set())} style={{ background: 'transparent', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Select all</button>
                  <button onClick={() => setExcluded(new Set(allRows.map(r => r.p.id)))} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Clear all</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '4px 14px' }}>
                {allRows.map(({ p }) => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)', padding: '4px 0' }}>
                    <input type='checkbox' checked={!excluded.has(p.id)} onChange={() => toggleProp(p.id)} style={{ width: '15px', height: '15px', accentColor: 'var(--green)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</span>
                  </label>
                ))}
              </div>
            </div>

          <div className='reo-doc'>
            <div className='reo-card' style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px 22px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{detail === 'basic' ? 'Real Estate — Property List' : 'Schedule of Real Estate Owned'}</div>
                  {borrower && <div style={{ fontSize: '14px', color: 'var(--text)', marginTop: '6px', fontWeight: 600 }}>{borrower}</div>}
                </div>
                <div className='lbl-muted' style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'right' }}>Prepared {today}<br />{rows.length} propert{rows.length === 1 ? 'y' : 'ies'}</div>
              </div>
            </div>

            <div className='reo-card' style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: detail === 'basic' ? '420px' : '760px' }}>
                <thead>
                  <tr>
                    <th style={thL}>Property</th>
                    <th style={thL}>Type</th>
                    {!groupBy && <th style={thL}>Owner / Entity</th>}
                    {detail === 'full' && <><th style={th}>Market Value</th><th style={th}>Loan Balance</th><th style={th}>Equity</th><th style={th}>Rent /mo</th><th style={th}>Payment /mo</th><th style={thL}>Status</th></>}
                  </tr>
                </thead>
                <tbody>
                  {groupBy ? (
                    groupNames.map(name => {
                      const grp = groupMap.get(name) as typeof rows
                      return [
                        <tr key={'h-' + name} style={{ background: 'var(--bg3)' }} className='reo-box'>
                          <td colSpan={colCount} style={{ ...tdL, fontWeight: 700, fontSize: '12px', borderTop: '0.5px solid var(--border)' }}>🏛 {name} <span className='lbl-muted' style={{ fontWeight: 400, color: 'var(--text3)' }}>· {grp.length} propert{grp.length === 1 ? 'y' : 'ies'}</span></td>
                        </tr>,
                        ...grp.map(propRow),
                        ...(detail === 'full' ? [totalsRow('Subtotal — ' + name, subtotal(grp), 's-' + name, 600)] : []),
                      ]
                    })
                  ) : (
                    rows.map(propRow)
                  )}
                  {detail === 'full' && totalsRow('TOTAL — ALL PROPERTIES', tot, 'grand')}
                </tbody>
              </table>
            </div>

            <div className='lbl-muted' style={{ fontSize: '10.5px', color: 'var(--text3)', lineHeight: 1.6, padding: '8px 4px 0' }}>
              Prepared from owner records.{detail === 'full' ? ' Market values are owner estimates; loan balances reflect the amount owed (interest-only loans show the full note). Rent is in-place scheduled rent. Subject to verification and appraisal.' : ' Property list — addresses, owning entities and types.'} {allRows.some(r => r.p.type === 'land' || r.p.type === 'primary_residence') ? '' : 'Tip: add your primary residence and any lots (Properties → Add Property → choose “Primary Residence” or “Land / Lot”) so the list is complete.'}
            </div>
          </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
