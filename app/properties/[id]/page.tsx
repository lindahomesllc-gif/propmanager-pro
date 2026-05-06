'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const [property, setProperty] = useState(null)
  const [tenants, setTenants] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = params.id
    Promise.all([
      supabase.from('properties').select('*').eq('id', id).eq('user_id', USER_ID).single(),
      supabase.from('tenants').select('*').eq('property_id', id).eq('user_id', USER_ID),
      supabase.from('payments').select('*').eq('property_id', id).eq('user_id', USER_ID).order('due_date', { ascending: false }).limit(10),
      supabase.from('expenses').select('*').eq('property_id', id).eq('user_id', USER_ID).order('expense_date', { ascending: false }).limit(10),
    ]).then(([p, t, pay, exp]) => {
      setProperty(p.data)
      setTenants(t.data || [])
      setPayments(pay.data || [])
      setExpenses(exp.data || [])
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <AppShell><div style={{ padding: '40px', color: '#5A5A56', textAlign: 'center' }}>Loading...</div></AppShell>
  if (!property) return <AppShell><div style={{ padding: '40px', color: '#5A5A56', textAlign: 'center' }}>Property not found.</div></AppShell>

  const p = property
  const totalRent = payments.filter(x => x.status === 'paid').reduce((s, x) => s + x.amount_paid, 0)
  const totalExp = expenses.reduce((s, x) => s + x.amount, 0)
  const equity = (p.market_value || 0) - (p.purchase_price || 0)

  const card = { background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }
  const lbl = { fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: '#F0EEE8', marginTop: '2px' }
  const btnG = { background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const btnP = { background: '#4ADE9A', color: '#0E0E0C', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div>
          <a href='/properties' style={{ fontSize: '11px', color: '#5A5A56', textDecoration: 'none' }}>← Properties</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8', marginTop: '2px' }}>{p.address}</div>
          <div style={{ fontSize: '12px', color: '#5A5A56' }}>{p.city}, {p.state} {p.zip}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={'/properties/' + p.id + '/edit'} style={btnG}>Edit</a>
          <span style={{ ...btnP, background: p.occupancy_status === 'occupied' ? '#4ADE9A22' : '#FBB04022', color: p.occupancy_status === 'occupied' ? '#4ADE9A' : '#FBB040', border: '0.5px solid ' + (p.occupancy_status === 'occupied' ? '#4ADE9A44' : '#FBB04044') }}>
            {p.occupancy_status === 'occupied' ? 'Occupied' : 'Vacant'}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Purchase Price', value: fm(p.purchase_price), color: '#F0EEE8' },
            { label: 'Market Value', value: fm(p.market_value), color: '#4ADE9A' },
            { label: 'Equity', value: fm(equity), color: equity >= 0 ? '#4ADE9A' : '#F87171' },
            { label: 'Rent Collected', value: fm(totalRent), color: '#4ADE9A' },
            { label: 'Expenses', value: fm(totalExp), color: '#FBB040' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={lbl}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <div style={card}>
              <div style={secTtl}>Property Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  ['Type', p.type ? p.type.replace('_', ' ') : '—'],
                  ['Ownership', p.owner_entity || 'Self'],
                  ['Bedrooms', p.bedrooms || '—'],
                  ['Bathrooms', p.bathrooms || '—'],
                  ['Sq Ft', p.sqft ? p.sqft.toLocaleString() : '—'],
                  ['Year Built', p.year_built || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#1E1E1B', borderRadius: '6px', padding: '8px 10px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={{ ...val, textTransform: 'capitalize' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={secTtl}>Tenants</div>
              {tenants.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#5A5A56' }}>No tenants assigned.</div>
              ) : tenants.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{t.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#5A5A56' }}>{t.email} {t.phone ? '· ' + t.phone : ''}</div>
                    <a href={'/tenants/' + t.id} style={{ fontSize: '11px', color: '#4ADE9A', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}>View Tenant →</a>
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: t.status === 'active' ? '#4ADE9A22' : '#A8A69E22', color: t.status === 'active' ? '#4ADE9A' : '#A8A69E' }}>{t.status}</span>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <a href={'/tenants/new?property=' + p.id} style={btnG}>+ Add Tenant</a>
              </div>
            </div>
          </div>

          <div>
            <div style={card}>
              <div style={secTtl}>Recent Payments</div>
              {payments.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#5A5A56' }}>No payments recorded.</div>
              ) : payments.slice(0, 5).map(pay => (
                <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#F0EEE8' }}>{formatDate(pay.due_date)}</div>
                    <div style={{ fontSize: '11px', color: '#5A5A56' }}>{pay.payment_method || 'manual'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: pay.status === 'paid' ? '#4ADE9A' : '#FBB040' }}>{fm(pay.amount_paid)}</div>
                    <div style={{ fontSize: '11px', color: '#5A5A56' }}>{pay.status}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <a href='/payments/new' style={btnG}>+ Record Payment</a>
              </div>
            </div>

            <div style={card}>
              <div style={secTtl}>Recent Expenses</div>
              {expenses.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#5A5A56' }}>No expenses recorded.</div>
              ) : expenses.slice(0, 5).map(exp => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#F0EEE8', textTransform: 'capitalize' }}>{exp.category.replace('_', ' ')}</div>
                    <div style={{ fontSize: '11px', color: '#5A5A56' }}>{formatDate(exp.expense_date)}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#FBB040' }}>{fm(exp.amount)}</div>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <a href='/expenses/new' style={btnG}>+ Add Expense</a>
              </div>
            </div>
          </div>
        </div>

        {p.notes && (
          <div style={card}>
            <div style={secTtl}>Notes</div>
            <div style={{ fontSize: '13px', color: '#A8A69E', lineHeight: '1.6' }}>{p.notes}</div>
          </div>
        )}
      </div>
    </AppShell>
  )
}