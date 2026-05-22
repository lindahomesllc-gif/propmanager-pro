'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm } from '@/lib/supabase'

export default function TaxPage() {
  const [expenses, setExpenses] = useState([])
  const [payments, setPayments] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [propFilter, setPropFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('expenses').select('*, properties(address)').eq('user_id', USER_ID),
      supabase.from('payments').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).eq('status', 'paid'),
      supabase.from('properties').select('id, address').eq('user_id', USER_ID),
    ]).then(([e, p, pr]) => {
      setExpenses(e.data || [])
      setPayments(p.data || [])
      setProperties(pr.data || [])
      setLoading(false)
    })
  }, [])

  const yearExp = expenses.filter(e => e.expense_date?.startsWith(String(year)) && (propFilter === 'all' || e.property_id === propFilter))
  const yearPay = payments.filter(p => p.paid_date?.startsWith(String(year)) && (propFilter === 'all' || p.property_id === propFilter))

  const totalIncome = yearPay.reduce((s, p) => s + (p.amount_paid || 0), 0)
  const totalExp = yearExp.reduce((s, e) => s + (e.amount || 0), 0)
  const deductible = yearExp.filter(e => e.is_deductible).reduce((s, e) => s + (e.amount || 0), 0)
  const netIncome = totalIncome - deductible

  const categories = [...new Set(yearExp.map(e => e.category))].sort()
  const byCategory = categories.map(cat => ({
    cat,
    total: yearExp.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    count: yearExp.filter(e => e.category === cat).length,
    deductible: yearExp.filter(e => e.category === cat && e.is_deductible).reduce((s, e) => s + e.amount, 0),
  })).sort((a, b) => b.total - a.total)

  const sel = { padding: '6px 10px', fontSize: '12px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Tax Reports</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={sel}>
            <option value='all'>All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={sel}>
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>}
        {!loading && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
              {[
                { label: '💰 Gross Income', value: fm(totalIncome), color: 'var(--green)' },
                { label: '💸 Total Expenses', value: fm(totalExp), color: 'var(--red)' },
                { label: '✅ Deductible', value: fm(deductible), color: 'var(--amber)' },
                { label: '📈 Net Taxable', value: fm(netIncome), color: netIncome >= 0 ? 'var(--green)' : 'var(--red)' },
              ].map((mc, i) => (
                <div key={mc.label} style={{ padding: '16px 20px', background: 'var(--bg2)', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>Schedule E Summary</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Gross Rental Income</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--green)' }}>{fm(totalIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Total Deductible Expenses</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--red)' }}>({fm(deductible)})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Net Income / (Loss)</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: netIncome >= 0 ? 'var(--green)' : 'var(--red)' }}>{fm(netIncome)}</span>
                </div>
              </div>

              <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>Expenses by Category</div>
                {byCategory.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No expenses for {year}.</div>
                ) : byCategory.map(c => (
                  <div key={c.cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text)', textTransform: 'capitalize' }}>{c.cat.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{c.count} records · {fm(c.deductible)} deductible</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--red)' }}>{fm(c.total)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)' }}>All Deductible Expenses {year}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{yearExp.filter(e => e.is_deductible).length} records</div>
              </div>
              {yearExp.filter(e => e.is_deductible).length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No deductible expenses recorded for {year}.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                      {['Date','Property','Category','Vendor','Amount'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yearExp.filter(e => e.is_deductible).map(e => (
                      <tr key={e.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)' }}>{e.expense_date}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text)' }}>{e.properties?.address || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)', textTransform: 'capitalize' }}>{e.category?.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)' }}>{e.vendor_name || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 600, color: 'var(--red)' }}>{fm(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}