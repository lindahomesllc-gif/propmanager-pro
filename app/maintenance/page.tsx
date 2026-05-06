'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function MaintenancePage() {
  const [tickets, setTickets] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [propFilter, setPropFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('maintenance').select('*, properties(address), tenants(full_name)').eq('user_id', USER_ID).order('created_at', { ascending: false }),
      supabase.from('properties').select('id, address').eq('user_id', USER_ID),
    ]).then(([m, p]) => {
      setTickets(m.data || [])
      setProperties(p.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = tickets.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false
    if (propFilter !== 'all' && t.property_id !== propFilter) return false
    return true
  })

  const open = tickets.filter(t => t.status === 'open').length
  const inProgress = tickets.filter(t => t.status === 'in_progress' || t.status === 'scheduled').length
  const completed = tickets.filter(t => t.status === 'completed').length
  const totalCost = tickets.filter(t => t.actual_cost).reduce((s, t) => s + (t.actual_cost || 0), 0)

  const priorityColor = (p) => ({ emergency: 'var(--red)', high: 'var(--amber)', medium: 'var(--blue)', low: 'var(--green)' }[p] || 'var(--text2)')
  const statusColor = (s) => ({ open: 'var(--amber)', scheduled: 'var(--blue)', in_progress: '#A78BFA', completed: 'var(--green)', cancelled: 'var(--text2)' }[s] || 'var(--text2)')

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Maintenance</div>
        <a href='/maintenance/new' style={{ background: 'var(--green)', color: 'var(--bg)', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>+ New Request</a>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Open', value: open, color: 'var(--amber)' },
            { label: 'In Progress', value: inProgress, color: '#A78BFA' },
            { label: 'Completed', value: completed, color: 'var(--green)' },
            { label: 'Total Requests', value: tickets.length, color: 'var(--text)' },
            { label: 'Total Cost', value: fm(totalCost), color: 'var(--red)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }}>
            <option value='all'>All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }}>
            <option value='all'>All Status</option>
            <option value='open'>Open</option>
            <option value='scheduled'>Scheduled</option>
            <option value='in_progress'>In Progress</option>
            <option value='completed'>Completed</option>
            <option value='cancelled'>Cancelled</option>
          </select>
        </div>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔧</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>No maintenance requests</div>
            <a href='/maintenance/new' style={{ background: 'var(--green)', color: 'var(--bg)', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Request</a>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gap: '10px' }}>
            {filtered.map(t => (
              <div key={t.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + priorityColor(t.priority), borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{t.properties?.address}</div>
                    {t.tenants && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>Reported by: {t.tenants.full_name}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: priorityColor(t.priority) + '22', color: priorityColor(t.priority), fontWeight: 600, textTransform: 'uppercase' }}>{t.priority}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: statusColor(t.status) + '22', color: statusColor(t.status), fontWeight: 600, textTransform: 'uppercase' }}>{t.status?.replace('_', ' ')}</span>
                  </div>
                </div>
                {t.description && <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>{t.description}</div>}
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text3)', marginBottom: '10px' }}>
                  {t.category && <span>📂 {t.category.replace('_', ' ')}</span>}
                  {t.scheduled_date && <span>📅 {formatDate(t.scheduled_date)}</span>}
                  {t.actual_cost && <span>💰 {fm(t.actual_cost)}</span>}
                  {t.estimated_cost && !t.actual_cost && <span>Est: {fm(t.estimated_cost)}</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={'/maintenance/' + t.id} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>View</a>
                  <a href={'/maintenance/' + t.id + '/edit'} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>Edit</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}