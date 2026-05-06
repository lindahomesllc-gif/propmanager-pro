'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function LeasesPage() {
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('leases')
      .select('*, properties(address), tenants(full_name, email, phone)')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setLeases(data || []); setLoading(false) })
  }, [])

  const statusColor = (s) => ({
    executed: '#4ADE9A',
    draft: '#A8A69E',
    sent: '#60A5FA',
    tenant_signed: '#FBB040',
    expired: '#F87171',
    terminated: '#F87171',
  }[s] || '#A8A69E')

  const active = leases.filter(l => l.status === 'executed')
  const draft = leases.filter(l => l.status === 'draft' || l.status === 'sent')
  const expired = leases.filter(l => l.status === 'expired' || l.status === 'terminated')

  const LeaseCard = ({ l }) => (
    <div style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + statusColor(l.status), borderRadius: '10px', padding: '16px 20px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8' }}>{l.tenants?.full_name || 'Unknown Tenant'}</div>
          <div style={{ fontSize: '12px', color: '#5A5A56', marginTop: '2px' }}>{l.properties?.address || 'No property'}</div>
          <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '4px' }}>
            {formatDate(l.start_date)} → {formatDate(l.end_date)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: '#4ADE9A' }}>{fm(l.rent_amount)}<span style={{ fontSize: '11px', color: '#5A5A56', fontFamily: 'Plus Jakarta Sans' }}>/mo</span></div>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: statusColor(l.status) + '22', color: statusColor(l.status), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l.status.replace('_', ' ')}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
        {[
          ['Deposit', fm(l.security_deposit)],
          ['Due Day', l.due_day ? 'Day ' + l.due_day : '—'],
          ['Late Fee', l.late_fee_amount ? fm(l.late_fee_amount) : '—'],
          ['Type', l.lease_type || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ background: '#1E1E1B', borderRadius: '6px', padding: '6px 10px' }}>
            <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#F0EEE8', marginTop: '2px', textTransform: 'capitalize' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <a href={'/leases/' + l.id} style={{ background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>View</a>
        <a href={'/leases/' + l.id + '/edit'} style={{ background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>Edit</a>
      </div>
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Leases</div>
        <a href='/leases/new' style={{ background: '#4ADE9A', color: '#0E0E0C', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>+ New Lease</a>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Active Leases', value: active.length, color: '#4ADE9A' },
            { label: 'In Progress', value: draft.length, color: '#FBB040' },
            { label: 'Monthly Rent', value: fm(active.reduce((s, l) => s + (l.rent_amount || 0), 0)), color: '#4ADE9A' },
            { label: 'Avg Rent', value: active.length ? fm(active.reduce((s, l) => s + (l.rent_amount || 0), 0) / active.length) : '—', color: '#F0EEE8' },
            { label: 'Expired', value: expired.length, color: expired.length > 0 ? '#F87171' : '#5A5A56' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading leases...</div>}

        {!loading && leases.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#A8A69E', marginBottom: '6px' }}>No leases yet</div>
            <div style={{ fontSize: '13px', marginBottom: '20px' }}>Create your first lease to get started.</div>
            <a href='/leases/new' style={{ background: '#4ADE9A', color: '#0E0E0C', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Lease</a>
          </div>
        )}

        {!loading && active.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#A8A69E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Active Leases</div>
            {active.map(l => <LeaseCard key={l.id} l={l} />)}
          </div>
        )}

        {!loading && draft.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#A8A69E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>In Progress</div>
            {draft.map(l => <LeaseCard key={l.id} l={l} />)}
          </div>
        )}

        {!loading && expired.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#A8A69E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Expired / Terminated</div>
            {expired.map(l => <LeaseCard key={l.id} l={l} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}