'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function AlertsPage() {
  const [payments, setPayments] = useState([])
  const [leases, setLeases] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [mortgages, setMortgages] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('payments').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).in('status', ['due', 'upcoming', 'late']).order('due_date'),
      supabase.from('leases').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).eq('status', 'executed'),
      supabase.from('maintenance').select('*, properties(address)').eq('user_id', USER_ID).in('status', ['open', 'scheduled']).order('created_at', { ascending: false }),
      supabase.from('mortgages').select('*, properties(address)').eq('user_id', USER_ID).eq('is_paid_off', false),
      supabase.from('properties').select('id, address, insurance_expires, insurance_company, insurance_premium, annual_tax, tax_due_date, county').eq('user_id', USER_ID),
    ]).then(([p, l, m, mo, props]) => {
      setPayments(p.data || [])
      setLeases(l.data || [])
      setMaintenance(m.data || [])
      setMortgages(mo.data || [])
      setProperties(props.data || [])
      setLoading(false)
    })
  }, [])

  const today = new Date()
  const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
  const in90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)

  const expiringLeases = leases.filter(l => {
    if (!l.end_date) return false
    const end = new Date(l.end_date)
    return end <= in90 && end >= today
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
    if (days < 0) return 'var(--red)'
    if (days <= 7) return 'var(--red)'
    if (days <= 30) return 'var(--amber)'
    return 'var(--blue)'
  }

  const Section = ({ title, count, color, children }) => (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</div>
        {count > 0 && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: color + '22', color: color, fontWeight: 700 }}>{count}</span>}
      </div>
      {children}
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Due Dates & Alerts</div>
        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>}
        {!loading && (
          <>
            {latePayments.length > 0 && (
              <Section title='Late Payments' count={latePayments.length} color='var(--red)'>
                {latePayments.map(p => (
                  <div key={p.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(248,113,113,0.3)', borderLeft: '3px solid #F87171', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{p.tenants?.full_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{p.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px' }}>Was due {formatDate(p.due_date)} · {Math.abs(daysUntil(p.due_date))} days overdue</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--red)' }}>{fm(p.amount_due)}</div>
                      <a href='/payments/new' style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>Record Payment →</a>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {duePayments.length > 0 && (
              <Section title='Upcoming Payments' count={duePayments.length} color='var(--amber)'>
                {duePayments.map(p => (
                  <div key={p.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #FBB040', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{p.tenants?.full_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{p.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '2px' }}>Due {formatDate(p.due_date)}</div>
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--amber)' }}>{fm(p.amount_due)}</div>
                  </div>
                ))}
              </Section>
            )}

            {expiringLeases.length > 0 && (
              <Section title='Expiring Leases (Next 90 Days)' count={expiringLeases.length} color='var(--blue)'>
                {expiringLeases.map(l => {
                  const days = daysUntil(l.end_date)
                  const color = urgencyColor(days)
                  return (
                    <div key={l.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + color, borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{l.tenants?.full_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{l.properties?.address}</div>
                        <div style={{ fontSize: '11px', color: color, marginTop: '2px' }}>Expires {formatDate(l.end_date)} · {days > 0 ? days + ' days left' : 'Expired'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--green)' }}>{fm(l.rent_amount)}<span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'Plus Jakarta Sans' }}>/mo</span></div>
                        <a href={'/leases/' + l.id} style={{ fontSize: '11px', color: 'var(--blue)', textDecoration: 'none' }}>View Lease →</a>
                      </div>
                    </div>
                  )
                })}
              </Section>
            )}

            {emergencyMaint.length > 0 && (
              <Section title='High Priority Maintenance' count={emergencyMaint.length} color='var(--red)'>
                {emergencyMaint.map(m => (
                  <div key={m.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #F87171', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{m.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px', textTransform: 'capitalize' }}>{m.priority} priority · {m.status?.replace('_', ' ')}</div>
                    </div>
                    <a href={'/maintenance/' + m.id} style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>View →</a>
                  </div>
                ))}
              </Section>
            )}

            {mortgages.length > 0 && (
              <Section title='Monthly Mortgage Payments' count={mortgages.length} color='var(--blue)'>
                {mortgages.map(m => (
                  <div key={m.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #60A5FA', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{m.lender_name || 'No lender'} · Due day {m.due_day}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>Balance: {fm(m.current_balance)}</div>
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--blue)' }}>{fm(m.monthly_payment)}</div>
                  </div>
                ))}
              </Section>
            )}

            {openMaint.length > 0 && (
              <Section title='Open Maintenance' count={openMaint.length} color='#A78BFA'>
                {openMaint.map(m => (
                  <div key={m.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #A78BFA', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{m.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: '#A78BFA', marginTop: '2px', textTransform: 'capitalize' }}>{m.priority} priority · {m.status?.replace('_', ' ')}</div>
                    </div>
                    <a href={'/maintenance/' + m.id} style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>View →</a>
                  </div>
                ))}
              </Section>
            )}

            {properties.filter(p => {
              if (!p.insurance_expires) return false
              const exp = new Date(p.insurance_expires)
              const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
              return daysLeft <= 30 && daysLeft >= 0
            }).map(p => {
              const exp = new Date(p.insurance_expires)
              const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
              return (
                <a key={p.id} href={'/properties/' + p.id + '/edit#insurance'} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid var(--amber)', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Insurance Expiring — {p.address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '2px' }}>{p.insurance_company || 'Insurance'} expires in {daysLeft} days · {formatDate(p.insurance_expires)}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--amber)' }}>{daysLeft}d</div>
                  </div>
                </a>
              )
            })}

            {properties.filter(p => {
              if (!p.tax_due_date) return false
              const due = new Date(p.tax_due_date)
              const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
              return daysLeft <= 30 && daysLeft >= 0
            }).map(p => {
              const due = new Date(p.tax_due_date)
              const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
              return (
                <a key={p.id + 'tax'} href={'/properties/' + p.id + '/edit#tax'} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid var(--red)', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Property Tax Due — {p.address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px' }}>{p.county ? p.county + ' County · ' : ''}Due in {daysLeft} days · {formatDate(p.tax_due_date)}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--red)' }}>{daysLeft}d</div>
                  </div>
                </a>
              )
            })}

            {latePayments.length === 0 && duePayments.length === 0 && expiringLeases.length === 0 && emergencyMaint.length === 0 && openMaint.length === 0 && mortgages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--green)', marginBottom: '6px' }}>All clear!</div>
                <div style={{ fontSize: '13px' }}>No outstanding alerts or due dates.</div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}