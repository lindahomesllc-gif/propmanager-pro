'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function MaintenanceDetailPage({ params }) {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('maintenance').select('*, properties(address, city, state), tenants(full_name, email, phone)')
      .eq('id', params.id).eq('user_id', USER_ID).single()
      .then(({ data }) => { setTicket(data); setLoading(false) })
  }, [params.id])

  if (loading) return <AppShell><div style={{ padding: '40px', color: '#5A5A56', textAlign: 'center' }}>Loading...</div></AppShell>
  if (!ticket) return <AppShell><div style={{ padding: '40px', color: '#5A5A56', textAlign: 'center' }}>Not found.</div></AppShell>

  const t = ticket
  const priorityColor = { emergency: '#F87171', high: '#FBB040', medium: '#60A5FA', low: '#4ADE9A' }[t.priority] || '#A8A69E'
  const statusColor = { open: '#FBB040', scheduled: '#60A5FA', in_progress: '#A78BFA', completed: '#4ADE9A', cancelled: '#A8A69E' }[t.status] || '#A8A69E'
  const card = { background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }
  const lbl = { fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: '#F0EEE8', marginTop: '2px' }
  const btnG = { background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div>
          <a href='/maintenance' style={{ fontSize: '11px', color: '#5A5A56', textDecoration: 'none' }}>← Maintenance</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8', marginTop: '2px' }}>{t.title}</div>
          <div style={{ fontSize: '12px', color: '#5A5A56' }}>{t.properties?.address}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: priorityColor + '22', color: priorityColor, fontWeight: 600, textTransform: 'uppercase' }}>{t.priority}</span>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: statusColor + '22', color: statusColor, fontWeight: 600, textTransform: 'uppercase' }}>{t.status?.replace('_', ' ')}</span>
          <a href={'/maintenance/' + t.id + '/edit'} style={btnG}>Edit</a>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Category', value: t.category?.replace(/_/g, ' ') || '—', color: '#F0EEE8' },
            { label: 'Scheduled', value: t.scheduled_date ? formatDate(t.scheduled_date) : 'Not set', color: '#60A5FA' },
            { label: 'Est. Cost', value: t.estimated_cost ? fm(t.estimated_cost) : '—', color: '#FBB040' },
            { label: 'Actual Cost', value: t.actual_cost ? fm(t.actual_cost) : '—', color: t.actual_cost ? '#F87171' : '#5A5A56' },
            { label: 'Completed', value: t.completed_date ? formatDate(t.completed_date) : '—', color: '#4ADE9A' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={lbl}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: mc.color, marginTop: '5px', textTransform: 'capitalize' }}>{mc.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <div style={card}>
              <div style={secTtl}>Description</div>
              <div style={{ fontSize: '13px', color: '#A8A69E', lineHeight: '1.6' }}>{t.description || 'No description provided.'}</div>
            </div>
            {t.landlord_notes && (
              <div style={card}>
                <div style={secTtl}>Landlord Notes</div>
                <div style={{ fontSize: '13px', color: '#A8A69E', lineHeight: '1.6' }}>{t.landlord_notes}</div>
              </div>
            )}
            {t.tenant_notes && (
              <div style={card}>
                <div style={secTtl}>Tenant Notes</div>
                <div style={{ fontSize: '13px', color: '#A8A69E', lineHeight: '1.6' }}>{t.tenant_notes}</div>
              </div>
            )}
          </div>
          <div>
            <div style={card}>
              <div style={secTtl}>Property</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{t.properties?.address}</div>
              <div style={{ fontSize: '12px', color: '#5A5A56', marginTop: '2px' }}>{t.properties?.city}, {t.properties?.state}</div>
            </div>
            {t.tenants && (
              <div style={card}>
                <div style={secTtl}>Reported By</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>{t.tenants.full_name}</div>
                <div style={{ fontSize: '12px', color: '#5A5A56', marginTop: '2px' }}>{t.tenants.email}</div>
                <div style={{ fontSize: '12px', color: '#5A5A56', marginTop: '2px' }}>{t.tenants.phone}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}