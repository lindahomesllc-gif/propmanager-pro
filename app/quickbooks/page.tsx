'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function QuickBooksPage() {
  const [expenses, setExpenses] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      supabase.from('expenses').select('*, properties(address)').eq('user_id', USER_ID).order('expense_date', { ascending: false }),
      supabase.from('payments').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).eq('status', 'paid').order('paid_date', { ascending: false }),
    ]).then(([e, p]) => {
      setExpenses(e.data || [])
      setPayments(p.data || [])
      setLoading(false)
    })
  }, [])

  const yearExp = expenses.filter(e => e.expense_date?.startsWith(String(year)))
  const yearPay = payments.filter(p => p.paid_date?.startsWith(String(year)))

  function exportCSV(type) {
    let csv = ''
    if (type === 'expenses') {
      csv = 'Date,Property,Category,Vendor,Description,Amount,Deductible\n'
      yearExp.forEach(e => {
        csv += `${e.expense_date},"${e.properties?.address || ''}","${e.category?.replace(/_/g, ' ') || ''}","${e.vendor_name || ''}","${e.description || ''}",${e.amount},${e.is_deductible ? 'Yes' : 'No'}\n`
      })
    } else {
      csv = 'Date,Tenant,Property,Amount,Method\n'
      yearPay.forEach(p => {
        csv += `${p.paid_date},"${p.tenants?.full_name || ''}","${p.properties?.address || ''}",${p.amount_paid},${p.payment_method || ''}\n`
      })
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `propmanager_${type}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalIncome = yearPay.reduce((s, p) => s + (p.amount_paid || 0), 0)
  const totalExp = yearExp.reduce((s, e) => s + (e.amount || 0), 0)
  const deductible = yearExp.filter(e => e.is_deductible).reduce((s, e) => s + (e.amount || 0), 0)

  const sel = { padding: '6px 10px', fontSize: '12px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }
  const btnP = { background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
  const btnB = { background: 'var(--blue-bg)', color: 'var(--blue)', border: '0.5px solid var(--blue)', borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>QuickBooks</div>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={sel}>
          {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ background: 'var(--blue-bg)', border: '0.5px solid var(--blue)', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>QuickBooks Direct Integration</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Connect your QuickBooks account to automatically sync income and expenses. Coming soon.</div>
          </div>
          <button style={{ ...btnB, opacity: 0.6, cursor: 'not-allowed' }}>Connect QuickBooks</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Income', value: fm(totalIncome), color: 'var(--green)' },
            { label: 'Total Expenses', value: fm(totalExp), color: 'var(--red)' },
            { label: 'Deductible', value: fm(deductible), color: 'var(--amber)' },
            { label: 'Net Income', value: fm(totalIncome - totalExp), color: totalIncome - totalExp >= 0 ? 'var(--green)' : 'var(--red)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={secTtl}>Income — {year} ({yearPay.length} records)</div>
            <button style={btnP} onClick={() => exportCSV('income')}>⬇ Export CSV</button>
          </div>
          {yearPay.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No income recorded for {year}.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Date','Tenant','Property','Amount','Method'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearPay.slice(0, 20).map(p => (
                  <tr key={p.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)' }}>{p.paid_date}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text)' }}>{p.tenants?.full_name || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)' }}>{p.properties?.address || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 600, color: 'var(--green)' }}>{fm(p.amount_paid)}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)', textTransform: 'capitalize' }}>{p.payment_method || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={secTtl}>Expenses — {year} ({yearExp.length} records)</div>
            <button style={btnP} onClick={() => exportCSV('expenses')}>⬇ Export CSV</button>
          </div>
          {yearExp.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No expenses recorded for {year}.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Date','Property','Category','Vendor','Amount','Deductible'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearExp.slice(0, 20).map(e => (
                  <tr key={e.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)' }}>{e.expense_date}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text)' }}>{e.properties?.address || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)', textTransform: 'capitalize' }}>{e.category?.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)' }}>{e.vendor_name || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 600, color: 'var(--red)' }}>{fm(e.amount)}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: e.is_deductible ? 'var(--green)' : 'var(--red)' }}>{e.is_deductible ? '✓ Yes' : '✗ No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}