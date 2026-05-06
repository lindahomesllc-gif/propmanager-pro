'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function IncomePage() {
  const [payments, setPayments] = useState([])
  const [leases, setLeases] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      supabase.from('payments').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).order('due_date', { ascending: false }),
      supabase.from('leases').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).eq('status', 'executed'),
      supabase.from('expenses').select('*').eq('user_id', USER_ID),
    ]).then(([p, l, e]) => {
      setPayments(p.data || [])
      setLeases(l.data || [])
      setExpenses(e.data || [])
      setLoading(false)
    })
  }, [])

  const yearPayments = payments.filter(p => p.paid_date?.startsWith(String(year)) && p.status === 'paid')
  const yearExpenses = expenses.filter(e => e.expense_date?.startsWith(String(year)))

  const totalIncome = yearPayments.reduce((s, p) => s + (p.amount_paid || 0), 0)
  const totalExpenses = yearExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const netIncome = totalIncome - totalExpenses
  const monthlyRent = leases.reduce((s, l) => s + (l.rent_amount || 0), 0)

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyData = months.map((m, i) => {
    const mo = String(i + 1).padStart(2, '0')
    const prefix = year + '-' + mo
    const inc = yearPayments.filter(p => p.paid_date?.startsWith(prefix)).reduce((s, p) => s + (p.amount_paid || 0), 0)
    const exp = yearExpenses.filter(e => e.expense_date?.startsWith(prefix)).reduce((s, e) => s + (e.amount || 0), 0)
    return { month: m, income: inc, expenses: exp, net: inc - exp }
  })

  const maxVal = Math.max(...monthlyData.map(m => Math.max(m.income, m.expenses)), 1)

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Income & P&L</div>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ padding: '6px 10px', fontSize: '12px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', outline: 'none' }}>
          {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Gross Income', value: fm(totalIncome), color: '#4ADE9A' },
            { label: 'Total Expenses', value: fm(totalExpenses), color: '#F87171' },
            { label: 'Net Income', value: fm(netIncome), color: netIncome >= 0 ? '#4ADE9A' : '#F87171' },
            { label: 'Monthly Rent Roll', value: fm(monthlyRent), color: '#60A5FA' },
            { label: 'Active Leases', value: leases.length, color: '#F0EEE8' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '16px' }}>Monthly Overview {year}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', marginBottom: '8px' }}>
            {monthlyData.map(m => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', display: 'flex', gap: '1px', alignItems: 'flex-end', height: '100px' }}>
                  <div style={{ flex: 1, background: '#4ADE9A44', borderRadius: '3px 3px 0 0', height: (m.income / maxVal * 100) + '%', minHeight: m.income > 0 ? '2px' : '0' }} />
                  <div style={{ flex: 1, background: '#F8717144', borderRadius: '3px 3px 0 0', height: (m.expenses / maxVal * 100) + '%', minHeight: m.expenses > 0 ? '2px' : '0' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {monthlyData.map(m => (
              <div key={m.month} style={{ flex: 1, fontSize: '9px', color: '#5A5A56', textAlign: 'center' }}>{m.month}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#4ADE9A44', border: '1px solid #4ADE9A' }} /><span style={{ fontSize: '11px', color: '#5A5A56' }}>Income</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#F8717144', border: '1px solid #F87171' }} /><span style={{ fontSize: '11px', color: '#5A5A56' }}>Expenses</span></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }}>Monthly Breakdown</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  {['Month', 'Income', 'Expenses', 'Net'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#5A5A56', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(m => (
                  <tr key={m.month} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '6px 8px', fontSize: '12px', color: '#A8A69E' }}>{m.month}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px', color: '#4ADE9A', fontWeight: m.income > 0 ? 600 : 400 }}>{m.income > 0 ? fm(m.income) : '—'}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px', color: '#F87171', fontWeight: m.expenses > 0 ? 600 : 400 }}>{m.expenses > 0 ? fm(m.expenses) : '—'}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px', color: m.net >= 0 ? '#4ADE9A' : '#F87171', fontWeight: 600 }}>{m.income > 0 || m.expenses > 0 ? fm(m.net) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }}>Active Rent Roll</div>
            {leases.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#5A5A56' }}>No active leases.</div>
            ) : leases.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{l.tenants?.full_name}</div>
                  <div style={{ fontSize: '11px', color: '#5A5A56' }}>{l.properties?.address}</div>
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#4ADE9A' }}>{fm(l.rent_amount)}</div>
              </div>
            ))}
            {leases.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0', marginTop: '4px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#5A5A56', textTransform: 'uppercase' }}>Total Monthly</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: '#4ADE9A' }}>{fm(monthlyRent)}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }}>Recent Payments {year}</div>
          {yearPayments.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#5A5A56' }}>No payments recorded for {year}.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  {['Date', 'Tenant', 'Property', 'Amount', 'Method'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#5A5A56', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearPayments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: '#A8A69E' }}>{formatDate(p.paid_date)}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: '#F0EEE8' }}>{p.tenants?.full_name || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: '#A8A69E' }}>{p.properties?.address || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 600, color: '#4ADE9A' }}>{fm(p.amount_paid)}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: '#A8A69E', textTransform: 'capitalize' }}>{p.payment_method || '—'}</td>
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