'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function LeaseDetailPage({ params }) {
  const [lease, setLease] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('leases').select('*, properties(address, city, state), tenants(full_name, email, phone)')
      .eq('id', params.id).eq('user_id', USER_ID).single()
      .then(({ data }) => { setLease(data); setLoading(false) })
  }, [params.id])

  if (loading) return <AppShell><div style={{ padding: '40px', color: '#5A5A56', textAlign: 'center' }}>Loading...</div></AppShell>
  if (!lease) return <AppShell><div style={{ padding: '40px', color: '#5A5A56', textAlign: 'center' }}>Lease not found.</div></AppShell>

  const l = lease
  const statusColor = { executed: '#4ADE9A', draft: '#A8A69E', sent: '#60A5FA', expired: '#F87171', terminated: '#F87171' }[l.status] || '#A8A69E'
  const card = { background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }
  const lbl = { fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: '#F0EEE8', marginTop: '2px' }
  const btnG = { background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div>
          <a href='/leases' style={{ fontSize: '11px', color: '#5A5A56', textDecoration: 'none' }}>← Leases</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8', marginTop: '2px' }}>{l.tenants?.full_name}</div>
          <div style={{ fontSize: '12px', color: '#5A5A56' }}>{l.properties?.address}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: statusColor + '22', color: statusColor, fontWeight: 600, textTransform: 'uppercase' }}>{l.status.replace('_', ' ')}</span>
          <a href={'/leases/' + l.id + '/edit'} style={btnG}>Edit</a>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Monthly Rent', value: fm(l.rent_amount), color: '#4ADE9A' },
            { label: 'Security Deposit', value: fm(l.security_deposit), color: '#F0EEE8' },
            { label: 'Late Fee', value: fm(l.late_fee_amount), color: '#FBB040' },
            { label: 'Due Day', value: 'Day ' + l.due_day, color: '#F0EEE8' },
            { label: 'Grace Period', value: l.grace_period_days + ' days', color: '#F0EEE8' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={lbl}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={card}>
            <div style={secTtl}>Lease Terms</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                ['Start Date', formatDate(l.start_date)],
                ['End Date', formatDate(l.end_date)],
                ['Lease Type', l.lease_type || '—'],
                ['Pet Policy', l.pet_policy || '—'],
                ['Parking', l.parking_spaces + ' space(s)'],
                ['Pet Deposit', fm(l.pet_deposit)],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#1E1E1B', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={lbl}>{k}</div>
                  <div style={{ ...val, textTransform: 'capitalize' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={secTtl}>Tenant Info</div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8' }}>{l.tenants?.full_name}</div>
              <div style={{ fontSize: '12px', color: '#5A5A56', marginTop: '4px' }}>{l.tenants?.email}</div>
              <div style={{ fontSize: '12px', color: '#5A5A56', marginTop: '2px' }}>{l.tenants?.phone}</div>
            </div>
            <div style={secTtl}>Property</div>
            <div style={{ fontSize: '13px', color: '#F0EEE8' }}>{l.properties?.address}</div>
            <div style={{ fontSize: '12px', color: '#5A5A56' }}>{l.properties?.city}, {l.properties?.state}</div>
          </div>
        </div>
        {l.special_clauses && (
          <div style={card}>
            <div style={secTtl}>Special Clauses</div>
            <div style={{ fontSize: '13px', color: '#A8A69E', lineHeight: '1.6' }}>{l.special_clauses}</div>
          </div>
        )}
      </div>
    </AppShell>
  )
}