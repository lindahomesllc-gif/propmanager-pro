'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function DashboardPage() {
  const [data, setData] = useState({ properties: [], tenants: [], payments: [], expenses: [], leases: [], maintenance: [], mortgages: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('properties').select('*').eq('user_id', USER_ID),
      supabase.from('tenants').select('*, properties(address)').eq('user_id', USER_ID).eq('status', 'active'),
      supabase.from('payments').select('*, tenants(full_name), properties(address)').eq('user_id', USER_ID).order('due_date', { ascending: false }).limit(50),
      supabase.from('expenses').select('*').eq('user_id', USER_ID),
      supabase.from('leases').select('*, tenants(full_name), properties(address)').eq('user_id', USER_ID).eq('status', 'executed'),
      supabase.from('maintenance').select('*, properties(address)').eq('user_id', USER_ID).in('status', ['open', 'scheduled', 'in_progress']),
      supabase.from('mortgages').select('*, properties(address)').eq('user_id', USER_ID).eq('is_paid_off', false),
    ]).then(([p, t, pay, exp, l, m, mo]) => {
      setData({ properties: p.data || [], tenants: t.data || [], payments: pay.data || [], expenses: exp.data || [], leases: l.data || [], maintenance: m.data || [], mortgages: mo.data || [] })
      setLoading(false)
    })
  }, [])

  const { properties, tenants, payments, expenses, leases, maintenance, mortgages } = data
  const occupied = properties.filter(p => p.occupancy_status === 'occupied')
  const vacant = properties.filter(p => p.occupancy_status === 'vacant')
  const thisYear = new Date().getFullYear().toString()
  const currentYear = new Date().getFullYear()
  const paidYTD = payments.filter(p => p.status === 'paid' && p.paid_date?.startsWith(thisYear))
  const latePayments = payments.filter(p => p.status === 'late')
  const duePayments = payments.filter(p => p.status === 'due' || p.status === 'upcoming')
  const totalRentRoll = leases.reduce((s, l) => s + (l.rent_amount || 0), 0)
  const totalExpYTD = expenses.filter(e => e.expense_date?.startsWith(thisYear)).reduce((s, e) => s + e.amount, 0)
  const totalCollectedYTD = paidYTD.reduce((s, p) => s + p.amount_paid, 0)
  const portfolioValue = properties.reduce((s, p) => s + (p.market_value || 0), 0)
  const totalEquity = properties.reduce((s, p) => s + ((p.market_value || 0) - (p.purchase_price || 0)), 0)
  const today = new Date()
  const in90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
  const expiringLeases = leases.filter(l => l.end_date && new Date(l.end_date) <= in90).sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
  const recentPayments = payments.filter(p => p.status === 'paid').slice(0, 5)

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const chartData = monthNames.map((month, i) => {
    const monthStr = String(i + 1).padStart(2, '0')
    const monthPayments = payments.filter(p => p.paid_date?.startsWith(thisYear + '-' + monthStr))
    const collected = monthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount_paid || 0), 0)
    return { month, collected, due: totalRentRoll }
  })

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Dashboard</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href='/properties/new' style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>+ Property</a>
          <a href='/tenants/new' style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>+ Tenant</a>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>Loading...</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Properties', value: properties.length, sub: occupied.length + ' occupied', color: 'var(--text)' },
                { label: 'Monthly Rent Roll', value: fm(totalRentRoll), sub: leases.length + ' active leases', color: 'var(--green)' },
                { label: 'Collected YTD', value: fm(totalCollectedYTD), sub: paidYTD.length + ' payments', color: 'var(--green)' },
                { label: 'Expenses YTD', value: fm(totalExpYTD), sub: 'Net: ' + fm(totalCollectedYTD - totalExpYTD), color: 'var(--amber)' },
                { label: 'Portfolio Value', value: fm(portfolioValue), sub: 'Equity: ' + fm(totalEquity), color: 'var(--text)' },
                { label: 'Late Payments', value: latePayments.length, sub: duePayments.length + ' upcoming', color: latePayments.length > 0 ? 'var(--red)' : 'var(--green)' },
              ].map(mc => (
                <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{mc.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rent Collection {currentYear}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text3)' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--green)', display: 'inline-block' }} />Collected</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text3)' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--border2)', display: 'inline-block' }} />Rent Roll</span>
                </div>
              </div>
              <ResponsiveContainer width='100%' height={180}>
                <BarChart data={chartData} barGap={4} barCategoryGap='30%'>
                  <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='3 3' />
                  <XAxis dataKey='month' tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v} width={40} />
                  <Tooltip contentStyle={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey='due' fill='var(--border2)' radius={[3,3,0,0]} />
                  <Bar dataKey='collected' fill='var(--green)' radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Properties</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {properties.map(p => (
                    <a key={p.id} href={'/properties/' + p.id} style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + (p.occupancy_status === 'occupied' ? 'var(--green)' : 'var(--amber)'), borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{p.address}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px', textTransform: 'capitalize' }}>{p.city} · {p.type?.replace(/_/g, ' ')} · {p.bedrooms}bd/{p.bathrooms}ba</div>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: p.occupancy_status === 'occupied' ? 'var(--green-bg)' : 'var(--amber-bg)', color: p.occupancy_status === 'occupied' ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>{p.occupancy_status}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Active Tenants & Rent Roll</div>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  {tenants.length === 0 ? <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text3)' }}>No active tenants.</div> : tenants.map(t => (
                    <a key={t.id} href={'/tenants/' + t.id} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{t.full_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{t.unit_address || t.properties?.address}</div>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 600 }}>active</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Recent Payments</div>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  {recentPayments.length === 0 ? <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text3)' }}>No payments yet.</div> : recentPayments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{p.tenants?.full_name || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{formatDate(p.paid_date)} · {p.payment_method}</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>{fm(p.amount_paid)}</div>
                    </div>
                  ))}
                  <a href='/payments' style={{ display: 'block', padding: '10px 14px', fontSize: '12px', color: 'var(--green)', textDecoration: 'none' }}>View all payments →</a>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Alerts</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {latePayments.map(p => (
                    <a key={p.id} href='/payments' style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid var(--red)', borderRadius: '8px', padding: '10px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Late Payment — {p.tenants?.full_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px' }}>Due {formatDate(p.due_date)} · {fm(p.amount_due)}</div>
                      </div>
                    </a>
                  ))}
                  {expiringLeases.map(l => (
                    <a key={l.id} href={'/leases/' + l.id} style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid var(--amber)', borderRadius: '8px', padding: '10px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Lease Expiring — {l.tenants?.full_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '2px' }}>Expires {formatDate(l.end_date)} · {l.properties?.address}</div>
                      </div>
                    </a>
                  ))}
                  {maintenance.filter(m => m.priority === 'emergency' || m.priority === 'high').map(m => (
                    <a key={m.id} href={'/maintenance/' + m.id} style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid var(--red)', borderRadius: '8px', padding: '10px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{m.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px', textTransform: 'capitalize' }}>{m.priority} priority · {m.properties?.address}</div>
                      </div>
                    </a>
                  ))}
                  {vacant.map(p => (
                    <a key={p.id} href={'/properties/' + p.id} style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid var(--amber)', borderRadius: '8px', padding: '10px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Vacant — {p.address}</div>
                        <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '2px' }}>{p.city} · {p.type?.replace(/_/g, ' ')}</div>
                      </div>
                    </a>
                  ))}
                  {latePayments.length === 0 && expiringLeases.length === 0 && maintenance.filter(m => m.priority === 'emergency' || m.priority === 'high').length === 0 && vacant.length === 0 && (
                    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '16px 14px', textAlign: 'center', color: 'var(--green)', fontSize: '13px' }}>✅ All clear — no alerts!</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Open Maintenance</div>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  {maintenance.length === 0 ? <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text3)' }}>No open maintenance requests.</div> : maintenance.slice(0, 5).map(m => (
                    <a key={m.id} href={'/maintenance/' + m.id} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{m.properties?.address}</div>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: m.priority === 'emergency' ? 'var(--red-bg)' : m.priority === 'high' ? 'var(--amber-bg)' : 'var(--bg3)', color: m.priority === 'emergency' ? 'var(--red)' : m.priority === 'high' ? 'var(--amber)' : 'var(--text3)', fontWeight: 600, textTransform: 'capitalize' }}>{m.priority}</span>
                      </div>
                    </a>
                  ))}
                  <a href='/maintenance' style={{ display: 'block', padding: '10px 14px', fontSize: '12px', color: 'var(--green)', textDecoration: 'none' }}>View all →</a>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Quick Actions</div>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  {[
                    { href: '/payments', icon: '💳', label: 'Record Payment', sub: duePayments.length + ' payments due' },
                    { href: '/tenants/new', icon: '👤', label: 'Add Tenant', sub: vacant.length + ' vacant units' },
                    { href: '/maintenance/new', icon: '🔧', label: 'New Maintenance Request', sub: maintenance.length + ' open' },
                    { href: '/expenses/new', icon: '💰', label: 'Add Expense', sub: 'Track property costs' },
                    { href: '/leases/new', icon: '📋', label: 'Create Lease', sub: 'E-sign ready' },
                    { href: '/tax', icon: '🧮', label: 'Tax Reports', sub: 'Schedule E ready' },
                  ].map((item, i) => (
                    <a key={i} href={item.href} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
                        <span style={{ fontSize: '16px' }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{item.label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{item.sub}</div>
                        </div>
                        <span style={{ color: 'var(--text3)', fontSize: '12px' }}>→</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}