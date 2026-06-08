'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate } from '@/lib/supabase'

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
      supabase.from('payments').select('*, properties(address), tenants(full_name)').in('status', ['due', 'upcoming', 'late']).order('due_date'),
      supabase.from('leases').select('*, properties(address), tenants(full_name)').eq('status', 'executed'),
      supabase.from('maintenance').select('*, properties(address)').in('status', ['open', 'scheduled']).order('created_at', { ascending: false }),
      supabase.from('mortgages').select('*, properties(address)').eq('is_paid_off', false),
      supabase.from('properties').select('id, address, insurance_expires, insurance_company, annual_tax, tax_due_date, county'),
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
  const daysSince = (date) => Math.max(0, Math.floor((today - new Date(date)) / (1000 * 60 * 60 * 24)))
  // Days until the next occurrence of a monthly due-day (never falsely negative)
  const nextDueDays = (dueDay) => {
    const d = today.getDate()
    if (dueDay >= d) return dueDay - d
    const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    return (dim - d) + dueDay
  }

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

  // Unified, cross-type, date-sorted list for the timeline + summary
  const allAlerts = [
    ...latePayments.map(p => ({ id: 'pl' + p.id, title: (p.tenants?.full_name || 'Tenant') + ' — Rent Overdue', subtitle: 'Was due ' + formatDate(p.due_date) + ' · ' + fm(p.amount_due), days: daysUntil(p.due_date), color: '#F87171', link: '/payments', amount: p.amount_due })),
    ...duePayments.map(p => ({ id: 'pd' + p.id, title: (p.tenants?.full_name || 'Tenant') + ' — Rent Due', subtitle: 'Due ' + formatDate(p.due_date) + ' · ' + fm(p.amount_due), days: daysUntil(p.due_date), color: urgencyColor(daysUntil(p.due_date)), link: '/payments', amount: p.amount_due })),
    ...expiringLeases.map(l => ({ id: 'ls' + l.id, title: (l.tenants?.full_name || 'Tenant') + ' — Lease ' + (l.days < 0 ? 'Expired' : 'Expires'), subtitle: formatDate(l.end_date) + ' · ' + (l.properties?.address || ''), days: l.days, color: urgencyColor(l.days), link: '/leases/' + l.id, amount: 0 })),
    ...insuranceAlerts.map(p => ({ id: 'in' + p.id, title: 'Insurance — ' + p.address, subtitle: (p.insurance_company || 'Insurance') + ' · Expires ' + formatDate(p.insurance_expires), days: p.days, color: urgencyColor(p.days), link: '/properties/' + p.id + '/edit#insurance', amount: 0 })),
    ...taxAlerts.map(p => ({ id: 'tx' + p.id, title: 'Property Tax — ' + p.address, subtitle: 'Due ' + formatDate(p.tax_due_date) + (p.annual_tax ? ' · ' + fm(p.annual_tax) : ''), days: p.days, color: urgencyColor(p.days), link: '/properties/' + p.id + '/edit#tax', amount: p.annual_tax || 0 })),
    ...emergencyMaint.map(m => ({ id: 'mt' + m.id, title: m.title, subtitle: (m.properties?.address || '') + ' · ' + m.priority + ' priority', days: m.scheduled_date ? daysUntil(m.scheduled_date) : 0, color: m.priority === 'emergency' ? '#F87171' : '#FBB040', link: '/maintenance/' + m.id, amount: 0 })),
    ...mortgages.map(m => ({ id: 'mo' + m.id, title: (m.properties?.address || 'Property') + ' — Mortgage', subtitle: (m.lender_name || 'No lender') + ' · Due day ' + m.due_day, days: nextDueDays(m.due_day), color: '#60A5FA', link: '/mortgage', amount: m.monthly_payment || 0 })),
  ].sort((a, b) => a.days - b.days)

  const overdueCount = allAlerts.filter(a => a.days < 0).length
  const weekCount = allAlerts.filter(a => a.days >= 0 && a.days <= 7).length
  const monthCount = allAlerts.filter(a => a.days > 7 && a.days <= 30).length
  const atRisk = allAlerts.filter(a => a.days <= 7).reduce((s, a) => s + (a.amount || 0), 0)

  const filters = ['all', 'urgent', 'payments', 'leases', 'insurance', 'maintenance', 'mortgage']

  const AlertCard = ({ title, subtitle, days, color, link, label }) => (
    <a href={link || '#'} onClick={!link ? e => e.preventDefault() : undefined} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + (color || urgencyColor(days)), borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: '11px', color: color || urgencyColor(days), marginTop: '2px' }}>{subtitle}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: color || urgencyColor(days), background: (color || urgencyColor(days)) + '22', padding: '2px 8px', borderRadius: '20px' }}>{label || urgencyLabel(days)}</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Overdue', value: overdueCount, color: 'var(--red)' },
                { label: 'This Week', value: weekCount, color: 'var(--amber)' },
                { label: 'Next 30 Days', value: monthCount, color: 'var(--blue)' },
                { label: 'Due Soon', value: fm(atRisk), color: 'var(--text)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: s.color, marginTop: '5px' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {(filter === 'all' || filter === 'urgent') && (() => {
              const horizon = filter === 'urgent' ? 7 : 30
              const timeline = allAlerts.filter(a => a.days <= horizon)
              return timeline.length > 0 ? (
                <Section title={'⏱ Next ' + horizon + ' Days'} count={timeline.length} color='var(--green)'>
                  {timeline.map(a => <AlertCard key={a.id} title={a.title} subtitle={a.subtitle} days={a.days} color={a.color} link={a.link} />)}
                </Section>
              ) : null
            })()}

            {(filter === 'all' || filter === 'payments') && latePayments.length > 0 && (
              <Section title='Late Payments' count={latePayments.length} color='var(--red)'>
                {latePayments.map(p => (
                  <AlertCard key={p.id} title={(p.tenants?.full_name || 'Tenant') + ' — Rent Overdue'} subtitle={'Was due ' + formatDate(p.due_date) + ' · ' + fm(p.amount_due)} days={daysUntil(p.due_date)} color='var(--red)' link='/payments' />
                ))}
              </Section>
            )}

            {(filter === 'all' || filter === 'payments') && duePayments.length > 0 && (
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

            {(filter === 'all' || filter === 'maintenance') && emergencyMaint.length > 0 && (
              <Section title='High Priority Maintenance' count={emergencyMaint.length} color='var(--red)'>
                {emergencyMaint.map(m => {
                  const d = m.scheduled_date ? daysUntil(m.scheduled_date) : null
                  return <AlertCard key={m.id} title={m.title} subtitle={(m.properties?.address || '') + ' · ' + m.priority + ' priority · ' + m.status?.replace('_', ' ') + (m.scheduled_date ? ' · scheduled ' + formatDate(m.scheduled_date) : '')} days={d ?? 0} label={d !== null ? undefined : (m.priority === 'emergency' ? '🔴 Emergency' : '🟠 High priority')} color={m.priority === 'emergency' ? '#F87171' : '#FBB040'} link={'/maintenance/' + m.id} />
                })}
              </Section>
            )}

            {(filter === 'all' || filter === 'maintenance') && openMaint.length > 0 && (
              <Section title='Open Maintenance' count={openMaint.length} color='var(--amber)'>
                {openMaint.map(m => {
                  const d = m.scheduled_date ? daysUntil(m.scheduled_date) : null
                  return <AlertCard key={m.id} title={m.title} subtitle={(m.properties?.address || '') + ' · ' + m.priority + ' priority' + (m.scheduled_date ? ' · scheduled ' + formatDate(m.scheduled_date) : '')} days={d ?? 0} label={d !== null ? undefined : 'Open ' + daysSince(m.created_at) + 'd'} color={d !== null ? undefined : '#A8A69E'} link={'/maintenance/' + m.id} />
                })}
              </Section>
            )}

            {(filter === 'all' || filter === 'mortgage') && mortgages.length > 0 && (
              <Section title='Monthly Mortgages' count={mortgages.length} color='var(--blue)'>
                {mortgages.map(m => (
                  <AlertCard key={m.id} title={(m.properties?.address || 'Property') + ' — Mortgage'} subtitle={(m.lender_name || 'No lender') + ' · Due day ' + m.due_day + ' · Balance: ' + fm(m.current_balance)} days={nextDueDays(m.due_day)} color='#60A5FA' link='/mortgage' />
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