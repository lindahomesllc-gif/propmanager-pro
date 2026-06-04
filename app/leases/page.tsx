'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function LeasesPage() {
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.from('leases').select('*, properties(address), tenants(full_name, co_tenant_name, email, phone)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setLeases(data || []); setLoading(false) })
  }, [])

  const statusColor = (s) => ({ executed: 'var(--green)', draft: 'var(--text3)', sent: 'var(--blue)', tenant_signed: 'var(--amber)', expired: 'var(--red)', terminated: 'var(--red)' }[s] || 'var(--text3)')
  const chipClass = (s) => ({ executed: 'chip-g', draft: 'chip-x', sent: 'chip-b', tenant_signed: 'chip-a', expired: 'chip-r', terminated: 'chip-r' }[s] || 'chip-x')

  const active = leases.filter(l => l.status === 'executed')
  const inProgress = leases.filter(l => l.status === 'draft' || l.status === 'sent' || l.status === 'tenant_signed')
  const expired = leases.filter(l => l.status === 'expired' || l.status === 'terminated')
  const monthlyRent = active.reduce((s, l) => s + (l.rent_amount || 0), 0)

  const today = new Date()
  const daysUntil = (date) => Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24))
  const expiryColor = (days) => days <= 30 ? 'var(--red)' : days <= 90 ? 'var(--amber)' : 'var(--green)'

  const filtered = filter === 'all' ? leases : filter === 'active' ? active : filter === 'in_progress' ? inProgress : expired

  const LeaseCard = ({ l }) => {
    const days = l.end_date ? daysUntil(l.end_date) : null
    const tenantName = l.tenants?.full_name + (l.tenants?.co_tenant_name ? ' & ' + l.tenants.co_tenant_name : '')
    return (
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + statusColor(l.status), borderRadius: '10px', padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{tenantName || 'Unknown Tenant'}</div>
              <span className={'chip ' + chipClass(l.status)} style={{ textTransform: 'uppercase' }}>{l.status?.replace('_', ' ')}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>📍 {l.properties?.address || 'No property'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>📅 {formatDate(l.start_date)} → <span style={{ color: days !== null ? expiryColor(days) : 'var(--text3)', fontWeight: days !== null && days <= 90 ? 600 : 400 }}>{formatDate(l.end_date)}{days !== null && days > 0 && days <= 90 ? ' (' + days + 'd)' : ''}</span></div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--green)' }}>{fm(l.rent_amount)}<span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 400 }}>/mo</span></div>
            {l.security_deposit && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>Deposit: {fm(l.security_deposit)}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {l.due_day && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--text2)', border: '0.5px solid var(--border)' }}>Due day {l.due_day}</span>}
          {l.late_fee_amount && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--text2)', border: '0.5px solid var(--border)' }}>Late fee {fm(l.late_fee_amount)}</span>}
          {l.lease_type && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--text2)', border: '0.5px solid var(--border)', textTransform: 'capitalize' }}>{l.lease_type}</span>}
          {l.pdf_url && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--green-bg)', color: 'var(--green)', border: '0.5px solid var(--green)' }}>📄 Signed</span>}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <a href={'/leases/' + l.id} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>View</a>
          <a href={'/leases/' + l.id + '/edit'} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>Edit</a>
          {l.tenants && <a href={'/tenants/' + l.tenant_id} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>View Tenant</a>}
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Leases</div>
        <a href='/leases/new' className='btn btn-primary'>+ New Lease</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '✅ Active', value: active.length, color: 'var(--green)', f: 'active' },
          { label: '🔄 In Progress', value: inProgress.length, color: 'var(--amber)', f: 'in_progress' },
          { label: '💰 Monthly Rent', value: fm(monthlyRent), color: 'var(--green)', f: null },
          { label: '❌ Expired', value: expired.length, color: expired.length > 0 ? 'var(--red)' : 'var(--text3)', f: 'expired' },
        ].map((mc, i) => (
          <button key={mc.label} onClick={() => mc.f && setFilter(filter === mc.f ? 'all' : mc.f)} style={{ padding: '14px 20px', background: filter === mc.f ? mc.color + '15' : 'var(--bg2)', border: 'none', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none', cursor: mc.f ? 'pointer' : 'default', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && leases.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '16px' }}>No leases yet</div>
            <a href='/leases/new' className='btn btn-primary'>+ New Lease</a>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gap: '10px' }}>
            {filtered.map(l => <LeaseCard key={l.id} l={l} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}