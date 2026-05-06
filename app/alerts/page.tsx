'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function AlertsPage() {
  const [payments, setPayments] = useState([])
  const [leases, setLeases] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [mortgages, setMortgages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('payments').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).in('status', ['due', 'upcoming', 'late']).order('due_date'),
      supabase.from('leases').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).eq('status', 'executed'),
      supabase.from('maintenance').select('*, properties(address)').eq('user_id', USER_ID).in('status', ['open', 'scheduled']).order('created_at', { ascending: false }),
      supabase.from('mortgages').select('*, properties(address)').eq('user_id', USER_ID).eq('is_paid_off', false),
    ]).then(([p, l, m, mo]) => {
      setPayments(p.data || [])
      setLeases(l.data || [])
      setMaintenance(m.data || [])
      setMortgages(mo.data || [])
      setLoading(false)
    })
  }, [])

  const today = new Date()
  const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
  const in90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)

  const expiringLeases = leases.filter(l => {
    const end = new Date(l.end_date)
    return end <= in90
  }).sort((a, b) => new Date(a.end_date) - new Date(b.end_date))

  const latePayments = payments.filter(p => p.status === 'late')
  const duePayments = payments.filter(p => p.status === 'due' || p.status === 'upcoming')
  const emergencyMaint = maintenance.filter(m => m.priority === 'emergency' || m.priority === 'high')
  const openMaint = maintenance.filter(m => m.priority !== 'emergency' && m.priority !== 'high')

  const daysUntil = (date) => {
    const diff = new Date(date) - today
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const urgencyColor = (days) => {
    if (days < 0) return '#F87171'
    if (days <= 7) return '#F87171'
    if (days <= 30) return '#FBB040'
    return '#60A5FA'
  }

  const Section = ({ title, count, color, children }) => (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#A8A69E', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</div>
        {count > 0 && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: color + '22', color: color, fontWeight: 700 }}>{count}</span>}
      </div>
      {children}
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Due Dates & Alerts</div>
        <div style={{ fontSize: '12px', color: '#5A5A56' }}>{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading...</div>}
        {!loading && (
          <>
            {latePayments.length > 0 && (
              <Section title='Late Payments' count={latePayments.length} color='#F87171'>
                {latePayments.map(p => (
                  <div key={p.id} style={{ background: '#161614', border: '0.5px solid rgba(248,113,113,0.3)', borderLeft: '3px solid #F87171', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{p.tenants?.full_name}</div>
                      <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>{p.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: '#F87171', marginTop: '2px' }}>Was due {formatDate(p.due_date)} · {Math.abs(daysUntil(p.due_date))} days overdue</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: '#F87171' }}>{fm(p.amount_due)}</div>
                      <a href='/payments/new' style={{ fontSize: '11px', color: '#4ADE9A', textDecoration: 'none' }}>Record Payment →</a>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {duePayments.length > 0 && (
              <Section title='Upcoming Payments' count={duePayments.length} color='#FBB040'>
                {duePayments.map(p => (
                  <div key={p.id} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #FBB040', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{p.tenants?.full_name}</div>
                      <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>{p.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: '#FBB040', marginTop: '2px' }}>Due {formatDate(p.due_date)}</div>
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: '#FBB040' }}>{fm(p.amount_due)}</div>
                  </div>
                ))}
              </Section>
            )}

            {expiringLeases.length > 0 && (
              <Section title='Expiring Leases (Next 90 Days)' count={expiringLeases.length} color='#60A5FA'>
                {expiringLeases.map(l => {
                  const days = daysUntil(l.end_date)
                  const color = urgencyColor(days)
                  return (
                    <div key={l.id} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + color, borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{l.tenants?.full_name}</div>
                        <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>{l.properties?.address}</div>
                        <div style={{ fontSize: '11px', color: color, marginTop: '2px' }}>Expires {formatDate(l.end_date)} · {days > 0 ? days + ' days left' : 'Expired'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: '#4ADE9A' }}>{fm(l.rent_amount)}<span style={{ fontSize: '11px', color: '#5A5A56', fontFamily: 'Plus Jakarta Sans' }}>/mo</span></div>
                        <a href={'/leases/' + l.id} style={{ fontSize: '11px', color: '#60A5FA', textDecoration: 'none' }}>View Lease →</a>
                      </div>
                    </div>
                  )
                })}
              </Section>
            )}

            {emergencyMaint.length > 0 && (
              <Section title='High Priority Maintenance' count={emergencyMaint.length} color='#F87171'>
                {emergencyMaint.map(m => (
                  <div key={m.id} style={{ background: '#161614', border: '0.5px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #F87171', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{m.title}</div>
                      <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>{m.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: '#F87171', marginTop: '2px', textTransform: 'capitalize' }}>{m.priority} priority · {m.status?.replace('_', ' ')}</div>
                    </div>
                    <a href={'/maintenance/' + m.id} style={{ fontSize: '11px', color: '#4ADE9A', textDecoration: 'none' }}>View →</a>
                  </div>
                ))}
              </Section>
            )}

            {mortgages.length > 0 && (
              <Section title='Monthly Mortgage Payments' count={mortgages.length} color='#60A5FA'>
                {mortgages.map(m => (
                  <div key={m.id} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #60A5FA', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{m.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>{m.lender_name || 'No lender'} · Due day {m.due_day}</div>
                      <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>Balance: {fm(m.current_balance)}</div>
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: '#60A5FA' }}>{fm(m.monthly_payment)}</div>
                  </div>
                ))}
              </Section>
            )}

            {openMaint.length > 0 && (
              <Section title='Open Maintenance' count={openMaint.length} color='#A78BFA'>
                {openMaint.map(m => (
                  <div key={m.id} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #A78BFA', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{m.title}</div>
                      <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>{m.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: '#A78BFA', marginTop: '2px', textTransform: 'capitalize' }}>{m.priority} priority · {m.status?.replace('_', ' ')}</div>
                    </div>
                    <a href={'/maintenance/' + m.id} style={{ fontSize: '11px', color: '#4ADE9A', textDecoration: 'none' }}>View →</a>
                  </div>
                ))}
              </Section>
            )}

            {latePayments.length === 0 && duePayments.length === 0 && expiringLeases.length === 0 && emergencyMaint.length === 0 && openMaint.length === 0 && mortgages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#4ADE9A', marginBottom: '6px' }}>All clear!</div>
                <div style={{ fontSize: '13px' }}>No outstanding alerts or due dates.</div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}