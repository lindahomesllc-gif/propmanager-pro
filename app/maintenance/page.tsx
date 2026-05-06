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

  const priorityColor = (p) => ({ emergency: '#F87171', high: '#FBB040', medium: '#60A5FA', low: '#4ADE9A' }[p] || '#A8A69E')
  const statusColor = (s) => ({ open: '#FBB040', scheduled: '#60A5FA', in_progress: '#A78BFA', completed: '#4ADE9A', cancelled: '#A8A69E' }[s] || '#A8A69E')

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Maintenance</div>
        <a href='/maintenance/new' style={{ background: '#4ADE9A', color: '#0E0E0C', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>+ New Request</a>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Open', value: open, color: '#FBB040' },
            { label: 'In Progress', value: inProgress, color: '#A78BFA' },
            { label: 'Completed', value: completed, color: '#4ADE9A' },
            { label: 'Total Requests', value: tickets.length, color: '#F0EEE8' },
            { label: 'Total Cost', value: fm(totalCost), color: '#F87171' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', outline: 'none' }}>
            <option value='all'>All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', outline: 'none' }}>
            <option value='all'>All Status</option>
            <option value='open'>Open</option>
            <option value='scheduled'>Scheduled</option>
            <option value='in_progress'>In Progress</option>
            <option value='completed'>Completed</option>
            <option value='cancelled'>Cancelled</option>
          </select>
        </div>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔧</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#A8A69E', marginBottom: '6px' }}>No maintenance requests</div>
            <a href='/maintenance/new' style={{ background: '#4ADE9A', color: '#0E0E0C', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Request</a>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gap: '10px' }}>
            {filtered.map(t => (
              <div key={t.id} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + priorityColor(t.priority), borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8' }}>{t.title}</div>
                    <div style={{ fontSize: '12px', color: '#5A5A56', marginTop: '2px' }}>{t.properties?.address}</div>
                    {t.tenants && <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>Reported by: {t.tenants.full_name}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: priorityColor(t.priority) + '22', color: priorityColor(t.priority), fontWeight: 600, textTransform: 'uppercase' }}>{t.priority}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: statusColor(t.status) + '22', color: statusColor(t.status), fontWeight: 600, textTransform: 'uppercase' }}>{t.status?.replace('_', ' ')}</span>
                  </div>
                </div>
                {t.description && <div style={{ fontSize: '12px', color: '#A8A69E', marginBottom: '8px' }}>{t.description}</div>}
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#5A5A56', marginBottom: '10px' }}>
                  {t.category && <span>📂 {t.category.replace('_', ' ')}</span>}
                  {t.scheduled_date && <span>📅 {formatDate(t.scheduled_date)}</span>}
                  {t.actual_cost && <span>💰 {fm(t.actual_cost)}</span>}
                  {t.estimated_cost && !t.actual_cost && <span>Est: {fm(t.estimated_cost)}</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={'/maintenance/' + t.id} style={{ background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>View</a>
                  <a href={'/maintenance/' + t.id + '/edit'} style={{ background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>Edit</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}