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
    executed: 'var(--green)',
    draft: 'var(--text2)',
    sent: 'var(--blue)',
    tenant_signed: 'var(--amber)',
    expired: 'var(--red)',
    terminated: 'var(--red)',
  }[s] || 'var(--text2)')

  const active = leases.filter(l => l.status === 'executed')
  const draft = leases.filter(l => l.status === 'draft' || l.status === 'sent')
  const expired = leases.filter(l => l.status === 'expired' || l.status === 'terminated')

  const LeaseCard = ({ l }) => (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + statusColor(l.status), borderRadius: '10px', padding: '16px 20px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{l.tenants?.full_name || 'Unknown Tenant'}</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{l.properties?.address || 'No property'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
            {formatDate(l.start_date)} → {formatDate(l.end_date)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--green)' }}>{fm(l.rent_amount)}<span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'Plus Jakarta Sans' }}>/mo</span></div>
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
          <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '6px 10px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginTop: '2px', textTransform: 'capitalize' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <a href={'/leases/' + l.id} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>View</a>
        <a href={'/leases/' + l.id + '/edit'} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>Edit</a>
      </div>
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Leases</div>
        <a href='/leases/new' style={{ background: 'var(--green)', color: 'var(--bg)', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>+ New Lease</a>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Active Leases', value: active.length, color: 'var(--green)' },
            { label: 'In Progress', value: draft.length, color: 'var(--amber)' },
            { label: 'Monthly Rent', value: fm(active.reduce((s, l) => s + (l.rent_amount || 0), 0)), color: 'var(--green)' },
            { label: 'Avg Rent', value: active.length ? fm(active.reduce((s, l) => s + (l.rent_amount || 0), 0) / active.length) : '—', color: 'var(--text)' },
            { label: 'Expired', value: expired.length, color: expired.length > 0 ? 'var(--red)' : 'var(--text3)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading leases...</div>}

        {!loading && leases.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>No leases yet</div>
            <div style={{ fontSize: '13px', marginBottom: '20px' }}>Create your first lease to get started.</div>
            <a href='/leases/new' style={{ background: 'var(--green)', color: 'var(--bg)', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Lease</a>
          </div>
        )}

        {!loading && active.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Active Leases</div>
            {active.map(l => <LeaseCard key={l.id} l={l} />)}
          </div>
        )}

        {!loading && draft.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>In Progress</div>
            {draft.map(l => <LeaseCard key={l.id} l={l} />)}
          </div>
        )}

        {!loading && expired.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Expired / Terminated</div>
            {expired.map(l => <LeaseCard key={l.id} l={l} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}