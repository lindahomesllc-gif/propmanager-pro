'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function IncomePage() {
  const [payments, setPayments] = useState([])
  const [leases, setLeases] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      supabase.from('payments').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).order('due_date', { ascending: false }),
      supabase.from('leases').select('*, properties(address), tenants(full_name, co_tenant_name)').eq('user_id', USER_ID).eq('status', 'executed'),
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
  const chartData = months.map((month, i) => {
    const mo = String(i + 1).padStart(2, '0')
    const prefix = year + '-' + mo
    const income = yearPayments.filter(p => p.paid_date?.startsWith(prefix)).reduce((s, p) => s + (p.amount_paid || 0), 0)
    const exp = yearExpenses.filter(e => e.expense_date?.startsWith(prefix)).reduce((s, e) => s + (e.amount || 0), 0)
    return { month, income, expenses: exp, net: income - exp }
  })

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Income & P&L</div>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ padding: '6px 12px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', fontWeight: 600 }}>
          {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '💰 Gross Income', value: fm(totalIncome), color: 'var(--green)' },
          { label: '💸 Total Expenses', value: fm(totalExpenses), color: 'var(--red)' },
          { label: '📈 Net Income', value: fm(netIncome), color: netIncome >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: '🏠 Monthly Rent Roll', value: fm(monthlyRent), color: 'var(--blue)' },
        ].map((mc, i) => (
          <div key={mc.label} style={{ padding: '14px 20px', background: 'var(--bg2)', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>}
        {!loading && (
          <>
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>📊 Monthly Overview {year}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text3)' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--green)', display: 'inline-block' }} />Income</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text3)' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--red)', display: 'inline-block' }} />Expenses</span>
                </div>
              </div>
              <ResponsiveContainer width='100%' height={200}>
                <BarChart data={chartData} barGap={4} barCategoryGap='30%'>
                  <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='3 3' />
                  <XAxis dataKey='month' tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v} width={40} />
                  <Tooltip contentStyle={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} formatter={(v) => fm(v)} />
                  <Bar dataKey='income' fill='var(--green)' radius={[3,3,0,0]} />
                  <Bar dataKey='expenses' fill='var(--red)' opacity={0.7} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>📅 Monthly Breakdown</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                      {['Month','Income','Expenses','Net'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map(m => (
                      <tr key={m.month} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td style={{ padding: '7px 8px', fontSize: '12px', color: 'var(--text2)', fontWeight: 600 }}>{m.month}</td>
                        <td style={{ padding: '7px 8px', fontSize: '12px', color: m.income > 0 ? 'var(--green)' : 'var(--text3)', fontWeight: m.income > 0 ? 600 : 400 }}>{m.income > 0 ? fm(m.income) : '—'}</td>
                        <td style={{ padding: '7px 8px', fontSize: '12px', color: m.expenses > 0 ? 'var(--red)' : 'var(--text3)', fontWeight: m.expenses > 0 ? 600 : 400 }}>{m.expenses > 0 ? fm(m.expenses) : '—'}</td>
                        <td style={{ padding: '7px 8px', fontSize: '12px', color: m.net >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{m.income > 0 || m.expenses > 0 ? fm(m.net) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>🏠 Active Rent Roll</div>
                {leases.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No active leases.</div>
                ) : leases.map(l => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{l.tenants?.full_name}{l.tenants?.co_tenant_name ? ' & ' + l.tenants.co_tenant_name : ''}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{l.properties?.address}</div>
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--green)' }}>{fm(l.rent_amount)}/mo</div>
                  </div>
                ))}
                {leases.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', marginTop: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Total Monthly</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--green)' }}>{fm(monthlyRent)}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>💳 Payments {year}</div>
              {yearPayments.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No payments recorded for {year}.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                      {['Date','Tenant','Property','Amount','Method'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yearPayments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)' }}>{formatDate(p.paid_date)}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{p.tenants?.full_name || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)' }}>{p.properties?.address || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>{fm(p.amount_paid)}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)', textTransform: 'capitalize' }}>{p.payment_method?.replace('_',' ') || '—'}</td>
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