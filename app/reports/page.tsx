'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate, computeReturns } from '@/lib/supabase'

export default function ReportsPage() {
  const [leases, setLeases] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [mortgages, setMortgages] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'rentroll' | 'pnl' | 'returns'>('rentroll')
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      supabase.from('leases').select('*, properties(address), tenants(full_name), units(label)').eq('status', 'executed'),
      supabase.from('payments').select('property_id, amount_paid, paid_date, status'),
      supabase.from('expenses').select('property_id, amount, expense_date'),
      supabase.from('properties').select('id, address, market_value, purchase_price, entity_id'),
      supabase.from('mortgages').select('property_id, current_balance, original_amount, interest_rate, term_years, is_paid_off'),
      supabase.from('entities').select('id, name'),
    ]).then(([l, p, e, pr, m, en]) => {
      setLeases(l.data || []); setPayments(p.data || []); setExpenses(e.data || []); setProperties(pr.data || []); setMortgages(m.data || []); setEntities(en.data || [])
      setLoading(false)
    })
  }, [])

  const monthlyRoll = leases.reduce((s, l) => s + (l.rent_amount || 0), 0)
  const annualRoll = monthlyRoll * 12

  // P&L by property for the selected year
  const addrOf = (id: string) => properties.find(p => p.id === id)?.address || '—'
  const yearStr = String(year)
  const propIds = Array.from(new Set([
    ...payments.filter(p => p.paid_date?.startsWith(yearStr)).map(p => p.property_id),
    ...expenses.filter(e => e.expense_date?.startsWith(yearStr)).map(e => e.property_id),
  ].filter(Boolean)))
  const pnl = propIds.map(id => {
    const income = payments.filter(p => p.property_id === id && p.status === 'paid' && p.paid_date?.startsWith(yearStr)).reduce((s, p) => s + (p.amount_paid || 0), 0)
    const expense = expenses.filter(e => e.property_id === id && e.expense_date?.startsWith(yearStr)).reduce((s, e) => s + (e.amount || 0), 0)
    return { id, address: addrOf(id), income, expense, net: income - expense }
  }).sort((a, b) => b.net - a.net)
  const totIncome = pnl.reduce((s, r) => s + r.income, 0)
  const totExpense = pnl.reduce((s, r) => s + r.expense, 0)

  // Investor returns — computed by the shared helper (same math used on the Dashboard).
  const { metrics, totals, entityRows } = computeReturns({ properties, leases, expenses, mortgages, entities, year })
  const mTotValue = totals.value, mTotNOI = totals.noi, mTotDebt = totals.debt, mTotCF = totals.cashFlow
  const blendedCap = totals.cap, portDSCR = totals.dscr

  const sel = { padding: '6px 10px', fontSize: '12px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' as const }
  const th = { padding: '10px 14px', textAlign: 'left' as const, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text3)' }
  const td = { padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }
  const tabs: { k: 'rentroll' | 'pnl' | 'returns'; label: string }[] = [{ k: 'rentroll', label: 'Rent Roll' }, { k: 'pnl', label: 'Profit & Loss' }, { k: 'returns', label: 'Returns' }]

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Reports</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(tab === 'pnl' || tab === 'returns') && (
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={sel}>
              {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <button className='btn btn-ghost' onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', border: 'none', borderBottom: tab === t.k ? '2px solid var(--green)' : '2px solid transparent', background: 'transparent', color: tab === t.k ? 'var(--green)' : 'var(--text2)', fontWeight: tab === t.k ? 600 : 400 }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '52px' }} />)}</div>
        ) : tab === 'rentroll' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Active Leases', value: leases.length, color: 'var(--text)' },
                { label: 'Monthly Rent Roll', value: fm(monthlyRoll), color: 'var(--green)' },
                { label: 'Annualized', value: fm(annualRoll), color: 'var(--green)' },
              ].map(mc => (
                <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
                </div>
              ))}
            </div>
            <div style={card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Property', 'Unit', 'Tenant', 'Monthly Rent', 'Deposit', 'Lease Ends'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {leases.length === 0 ? (
                    <tr><td style={{ ...td, color: 'var(--text3)' }} colSpan={6}>No active leases.</td></tr>
                  ) : leases.map(l => (
                    <tr key={l.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                      <td style={td}>{l.properties?.address || '—'}</td>
                      <td style={{ ...td, color: 'var(--text2)' }}>{l.units?.label || '—'}</td>
                      <td style={td}>{l.tenants?.full_name || '—'}</td>
                      <td style={{ ...td, fontWeight: 600, color: 'var(--green)' }}>{fm(l.rent_amount)}</td>
                      <td style={{ ...td, color: 'var(--text2)' }}>{l.security_deposit ? fm(l.security_deposit) : '—'}</td>
                      <td style={{ ...td, color: 'var(--text2)' }}>{l.end_date ? formatDate(l.end_date) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                {leases.length > 0 && (
                  <tfoot><tr style={{ borderTop: '0.5px solid var(--border)' }}>
                    <td style={{ ...td, fontWeight: 700 }} colSpan={3}>Total</td>
                    <td style={{ ...td, fontWeight: 700, color: 'var(--green)' }}>{fm(monthlyRoll)}/mo</td>
                    <td style={td} colSpan={2}></td>
                  </tr></tfoot>
                )}
              </table>
            </div>
          </>
        ) : tab === 'pnl' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Income ' + year, value: fm(totIncome), color: 'var(--green)' },
                { label: 'Expenses ' + year, value: fm(totExpense), color: 'var(--red)' },
                { label: 'Net ' + year, value: fm(totIncome - totExpense), color: (totIncome - totExpense) >= 0 ? 'var(--green)' : 'var(--red)' },
              ].map(mc => (
                <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
                </div>
              ))}
            </div>
            <div style={card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <th style={th}>Property</th>
                  <th style={{ ...th, textAlign: 'right' }}>Income</th>
                  <th style={{ ...th, textAlign: 'right' }}>Expenses</th>
                  <th style={{ ...th, textAlign: 'right' }}>Net</th>
                </tr></thead>
                <tbody>
                  {pnl.length === 0 ? (
                    <tr><td style={{ ...td, color: 'var(--text3)' }} colSpan={4}>No income or expenses recorded for {year}.</td></tr>
                  ) : pnl.map(r => (
                    <tr key={r.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                      <td style={td}>{r.address}</td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--green)' }}>{fm(r.income)}</td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--red)' }}>{fm(r.expense)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: r.net >= 0 ? 'var(--green)' : 'var(--red)' }}>{fm(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
                {pnl.length > 0 && (
                  <tfoot><tr style={{ borderTop: '0.5px solid var(--border)' }}>
                    <td style={{ ...td, fontWeight: 700 }}>Total</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fm(totIncome)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{fm(totExpense)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: (totIncome - totExpense) >= 0 ? 'var(--green)' : 'var(--red)' }}>{fm(totIncome - totExpense)}</td>
                  </tr></tfoot>
                )}
              </table>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px' }}>Operational income vs expenses (full amounts). For your ownership share &amp; deductible breakdown, see Tax Reports.</div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Portfolio NOI', value: fm(mTotNOI), color: 'var(--green)' },
                { label: 'Blended Cap Rate', value: blendedCap.toFixed(2) + '%', color: 'var(--text)' },
                { label: 'Pre-Tax Cash Flow', value: fm(mTotCF), color: mTotCF >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'Portfolio DSCR', value: portDSCR != null ? portDSCR.toFixed(2) + 'x' : '—', color: 'var(--text)' },
              ].map(mc => (
                <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
                </div>
              ))}
            </div>
            {entityRows.length > 1 && (
              <div style={{ ...card, marginBottom: '14px' }}>
                <div style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: 'var(--text)', borderBottom: '0.5px solid var(--border)' }}>By Entity</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <th style={th}>Entity</th>
                    {['Properties', 'NOI', 'Cap', 'DSCR', 'Cash Flow'].map(h => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {entityRows.map(r => (
                      <tr key={r.name} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                        <td style={{ ...td, textAlign: 'right', color: 'var(--text2)' }}>{r.count}</td>
                        <td style={{ ...td, textAlign: 'right', color: 'var(--green)' }}>{fm(r.noi)}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{r.cap != null ? r.cap.toFixed(2) + '%' : '—'}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{r.dscr != null ? r.dscr.toFixed(2) + 'x' : '—'}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: r.cf >= 0 ? 'var(--green)' : 'var(--red)' }}>{fm(r.cf)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <th style={th}>Property</th>
                  {['Value', 'NOI', 'Cap', 'Debt Svc', 'DSCR', 'Cash Flow', 'RoE'].map(h => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {metrics.length === 0 ? (
                    <tr><td style={{ ...td, color: 'var(--text3)' }} colSpan={8}>Add property values, rents, and loans to see returns.</td></tr>
                  ) : metrics.map(m => (
                    <tr key={m.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                      <td style={td}>{m.address}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fm(m.value)}</td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--green)' }}>{fm(m.noi)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{m.cap != null ? m.cap.toFixed(2) + '%' : '—'}</td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--red)' }}>{fm(m.debt)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{m.dscr != null ? m.dscr.toFixed(2) + 'x' : '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: m.cashFlow >= 0 ? 'var(--green)' : 'var(--red)' }}>{fm(m.cashFlow)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{m.roe != null ? m.roe.toFixed(1) + '%' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                {metrics.length > 0 && (
                  <tfoot><tr style={{ borderTop: '0.5px solid var(--border)' }}>
                    <td style={{ ...td, fontWeight: 700 }}>Portfolio</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fm(mTotValue)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fm(mTotNOI)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{blendedCap.toFixed(2)}%</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{fm(mTotDebt)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{portDSCR != null ? portDSCR.toFixed(2) + 'x' : '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: mTotCF >= 0 ? 'var(--green)' : 'var(--red)' }}>{fm(mTotCF)}</td>
                    <td style={{ ...td, textAlign: 'right' }}></td>
                  </tr></tfoot>
                )}
              </table>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px', lineHeight: 1.6 }}>
              <strong>How these are figured:</strong> NOI = annualized in-place rent (active leases × 12) − {year} operating expenses. Cap Rate = NOI ÷ value. Debt Service &amp; DSCR use <strong>principal &amp; interest only</strong> (computed per loan, escrow excluded). Cash Flow = NOI − debt service. RoE = cash flow ÷ equity (value − loan balance). Accuracy depends on keeping rents, values &amp; expenses current. Cash flow is pre-reserves (no vacancy/capex set-aside).
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
