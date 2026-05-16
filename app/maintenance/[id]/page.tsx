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

  async function deleteTicket() {
    if (!confirm('Are you sure you want to delete this maintenance request?')) return
    await supabase.from('maintenance').delete().eq('id', params.id).eq('user_id', USER_ID)
    window.location.href = '/maintenance'
  }

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>
  if (!ticket) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Not found.</div></AppShell>

  const t = ticket
  const priorityColor = { emergency: 'var(--red)', high: 'var(--amber)', medium: 'var(--blue)', low: 'var(--green)' }[t.priority] || 'var(--text2)'
  const statusColor = { open: 'var(--amber)', scheduled: 'var(--blue)', in_progress: '#A78BFA', completed: 'var(--green)', cancelled: 'var(--text2)' }[t.status] || 'var(--text2)'
  const card = { background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }
  const lbl = { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }
  const btnG = { background: 'transparent', color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href='/maintenance' style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Maintenance</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>{t.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{t.properties?.address}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: priorityColor + '22', color: priorityColor, fontWeight: 600, textTransform: 'uppercase' }}>{t.priority}</span>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: statusColor + '22', color: statusColor, fontWeight: 600, textTransform: 'uppercase' }}>{t.status?.replace('_', ' ')}</span>
          <a href={'/maintenance/' + t.id + '/edit'} style={btnG}>Edit</a>
          <button onClick={deleteTicket} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Category', value: t.category?.replace(/_/g, ' ') || '—', color: 'var(--text)' },
            { label: 'Scheduled', value: t.scheduled_date ? formatDate(t.scheduled_date) : 'Not set', color: 'var(--blue)' },
            { label: 'Est. Cost', value: t.estimated_cost ? fm(t.estimated_cost) : '—', color: 'var(--amber)' },
            { label: 'Actual Cost', value: t.actual_cost ? fm(t.actual_cost) : '—', color: t.actual_cost ? 'var(--red)' : 'var(--text3)' },
            { label: 'Completed', value: t.completed_date ? formatDate(t.completed_date) : '—', color: 'var(--green)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={lbl}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: mc.color, marginTop: '5px', textTransform: 'capitalize' }}>{mc.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <div style={card}>
              <div style={secTtl}>Description</div>
              <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>{t.description || 'No description provided.'}</div>
            </div>
            {t.landlord_notes && (
              <div style={card}>
                <div style={secTtl}>Landlord Notes</div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>{t.landlord_notes}</div>
              </div>
            )}
            {t.tenant_notes && (
              <div style={card}>
                <div style={secTtl}>Tenant Notes</div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>{t.tenant_notes}</div>
              </div>
            )}
          </div>
          <div>
            <div style={card}>
              <div style={secTtl}>Property</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{t.properties?.address}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{t.properties?.city}, {t.properties?.state}</div>
            </div>
            {t.tenants && (
              <div style={card}>
                <div style={secTtl}>Reported By</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{t.tenants.full_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{t.tenants.email}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{t.tenants.phone}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}