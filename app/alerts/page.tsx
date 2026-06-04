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
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('payments').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).in('status', ['due', 'upcoming', 'late']).order('due_date'),
      supabase.from('leases').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).eq('status', 'executed'),
      supabase.from('maintenance').select('*, properties(address)').eq('user_id', USER_ID).in('status', ['open', 'scheduled']).order('created_at', { ascending: false }),
      supabase.from('mortgages').select('*, properties(address)').eq('user_id', USER_ID).eq('is_paid_off', false),
      supabase.from('properties').select('id, address, insurance_expires, insurance_company, annual_tax, tax_due_date, county').eq('user_id', USER_ID),
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
  const daysUntil = (date) => Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24))

  const urgencyColor = (days) => {
    if (days < 0) return '#F87171'
    if (days <= 30) return '#F87171'
    if (days <= 60) return '#FBB040'
    if (days <= 90) return '#60A5FA'
    return '#A8A69E'
  }

  const urgencyLabel = (days) => {
    if (days < 0) return '🔴 Overdue'
    if (days <= 7) return '🔴 This week'
    if (days <= 30) return '🔴 This month'
    if (days <= 60) return '🟡 60 days'
    if (days <= 90) return '🔵 90 days'
    return '⚪ ' + days + ' days away'
  }

  const latePayments = payments.filter(p => p.status === 'late')
  const duePayments = payments.filter(p => p.status === 'due' || p.status === 'upcoming')

  const expiringLeases = leases
    .filter(l => l.end_date)
    .map(l => ({ ...l, days: daysUntil(l.end_date) }))
    .sort((a, b) => a.days - b.days)

  const insuranceAlerts = properties
    .filter(p => p.insurance_expires)
    .map(p => ({ ...p, days: daysUntil(p.insurance_expires) }))
    .sort((a, b) => a.days - b.days)

  const taxAlerts = properties
    .filter(p => p.tax_due_date)
    .map(p => ({ ...p, days: daysUntil(p.tax_due_date) }))
    .sort((a, b) => a.days - b.days)

  const emergencyMaint = maintenance.filter(m => m.priority === 'emergency' || m.priority === 'high')
  const openMaint = maintenance.filter(m => m.priority !== 'emergency' && m.priority !== 'high')

  const filters = ['all', 'urgent', 'payments', 'leases', 'insurance', 'maintenance', 'mortgage']

  const AlertCard = ({ title, subtitle, days, color, link, onDelete }) => (
    <a href={link || '#'} onClick={!link ? e => e.preventDefault() : undefined} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + (color || urgencyColor(days)), borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: '11px', color: color || urgencyColor(days), marginTop: '2px' }}>{subtitle}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: color || urgencyColor(days), background: (color || urgencyColor(days)) + '22', padding: '2px 8px', borderRadius: '20px' }}>{urgencyLabel(days)}</div>
        </div>
      </div>
    </a>
  )

  const Section = ({ title, count, color, children }) => (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</div>
        {count > 0 && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: (color || 'var(--amber)') + '22', color: color || 'var(--amber)', fontWeight: 700 }}>{count}</span>}
      </div>
      {children}
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Due Dates & Alerts</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px', border: '0.5px solid var(--border2)', background: filter === f ? 'var(--green)' : 'transparent', color: filter === f ? '#fff' : 'var(--text2)', cursor: 'pointer', fontWeight: filter === f ? 700 : 400, textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && (
          <>
            {(filter === 'all' || filter === 'urgent' || filter === 'payments') && latePayments.length > 0 && (
              <Section title='Late Payments' count={latePayments.length} color='var(--red)'>
                {latePayments.map(p => (
                  <AlertCard key={p.id} title={(p.tenants?.full_name || 'Tenant') + ' — Rent Overdue'} subtitle={'Was due ' + formatDate(p.due_date) + ' · ' + fm(p.amount_due)} days={daysUntil(p.due_date)} color='var(--red)' link='/payments' />
                ))}
              </Section>
            )}

            {(filter === 'all' || filter === 'urgent' || filter === 'payments') && duePayments.length > 0 && (
              <Section title='Upcoming Payments' count={duePayments.length} color='var(--amber)'>
                {duePayments.map(p => (
                  <AlertCard key={p.id} title={(p.tenants?.full_name || 'Tenant') + ' — Rent Due'} subtitle={'Due ' + formatDate(p.due_date) + ' · ' + fm(p.amount_due)} days={daysUntil(p.due_date)} link='/payments' />
                ))}
              </Section>
            )}

            {(filter === 'all' || filter === 'leases') && expiringLeases.length > 0 && (
              <Section title='Lease Expirations' count={expiringLeases.length} color='var(--blue)'>
                {expiringLeases.map(l => (
                  <AlertCard key={l.id} title={(l.tenants?.full_name || 'Tenant') + ' — Lease ' + (l.days < 0 ? 'Expired' : 'Expires')} subtitle={formatDate(l.end_date) + ' · ' + (l.properties?.address || '') + ' · ' + fm(l.rent_amount) + '/mo'} days={l.days} link={'/leases/' + l.id} />
                ))}
              </Section>
            )}

            {(filter === 'all' || filter === 'insurance') && insuranceAlerts.length > 0 && (
              <Section title='Insurance Renewals' count={insuranceAlerts.length} color='var(--amber)'>
                {insuranceAlerts.map(p => (
                  <AlertCard key={p.id + 'ins'} title={'Insurance Expiring — ' + p.address} subtitle={(p.insurance_company || 'Insurance') + ' · Expires ' + formatDate(p.insurance_expires)} days={p.days} link={'/properties/' + p.id + '/edit#insurance'} />
                ))}
              </Section>
            )}

            {(filter === 'all' || filter === 'insurance') && taxAlerts.length > 0 && (
              <Section title='Property Tax Due' count={taxAlerts.length} color='var(--red)'>
                {taxAlerts.map(p => (
                  <AlertCard key={p.id + 'tax'} title={'Property Tax — ' + p.address} subtitle={(p.county ? p.county + ' County · ' : '') + 'Due ' + formatDate(p.tax_due_date) + (p.annual_tax ? ' · ' + fm(p.annual_tax) : '')} days={p.days} link={'/properties/' + p.id + '/edit#tax'} />
                ))}
              </Section>
            )}

            {(filter === 'all' || filter === 'urgent' || filter === 'maintenance') && emergencyMaint.length > 0 && (
              <Section title='High Priority Maintenance' count={emergencyMaint.length} color='var(--red)'>
                {emergencyMaint.map(m => (
                  <AlertCard key={m.id} title={m.title} subtitle={(m.properties?.address || '') + ' · ' + m.priority + ' priority · ' + m.status?.replace('_', ' ')} days={0} color='var(--red)' link={'/maintenance/' + m.id} />
                ))}
              </Section>
            )}

            {(filter === 'all' || filter === 'maintenance') && openMaint.length > 0 && (
              <Section title='Open Maintenance' count={openMaint.length} color='var(--amber)'>
                {openMaint.map(m => (
                  <AlertCard key={m.id} title={m.title} subtitle={(m.properties?.address || '') + ' · ' + m.priority + ' priority'} days={7} link={'/maintenance/' + m.id} />
                ))}
              </Section>
            )}

            {(filter === 'all' || filter === 'mortgage') && mortgages.length > 0 && (
              <Section title='Monthly Mortgages' count={mortgages.length} color='var(--blue)'>
                {mortgages.map(m => (
                  <AlertCard key={m.id} title={(m.properties?.address || 'Property') + ' — Mortgage'} subtitle={(m.lender_name || 'No lender') + ' · Due day ' + m.due_day + ' · Balance: ' + fm(m.current_balance)} days={m.due_day - today.getDate()} color='var(--blue)' link='/mortgage' />
                ))}
              </Section>
            )}

            {latePayments.length === 0 && duePayments.length === 0 && expiringLeases.length === 0 && insuranceAlerts.length === 0 && taxAlerts.length === 0 && emergencyMaint.length === 0 && openMaint.length === 0 && (
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