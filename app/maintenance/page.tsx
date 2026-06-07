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
  const [view, setView] = useState('list')

  useEffect(() => {
    Promise.all([
      supabase.from('maintenance').select('*, properties(address), tenants(full_name)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, address'),
    ]).then(([m, p]) => {
      setTickets(m.data || [])
      setProperties(p.data || [])
      setLoading(false)
    })
  }, [])

  async function updateStatus(id, status) {
    await supabase.from('maintenance').update({ status }).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function deleteTicket(id) {
    if (!confirm('Delete this maintenance request?')) return
    await supabase.from('maintenance').delete().eq('id', id)
    setTickets(prev => prev.filter(t => t.id !== id))
  }

  const filtered = tickets.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false
    if (propFilter !== 'all' && t.property_id !== propFilter) return false
    return true
  })

  const open = tickets.filter(t => t.status === 'open').length
  const inProgress = tickets.filter(t => t.status === 'in_progress' || t.status === 'scheduled').length
  const completed = tickets.filter(t => t.status === 'completed').length
  const totalCost = tickets.filter(t => t.actual_cost).reduce((s, t) => s + (t.actual_cost || 0), 0)

  const priorityColor = (p) => ({ emergency: 'var(--red)', high: 'var(--amber)', medium: 'var(--blue)', low: 'var(--green)' }[p] || 'var(--text3)')
  const priorityBg = (p) => ({ emergency: 'var(--red-bg)', high: 'var(--amber-bg)', medium: 'var(--bg3)', low: 'var(--green-bg)' }[p] || 'var(--bg3)')
  const chipClass = (s) => ({ open: 'chip-a', scheduled: 'chip-b', in_progress: 'chip-b', completed: 'chip-g', cancelled: 'chip-x' }[s] || 'chip-x')

  const TicketCard = ({ t, compact = false }) => {
    const ageDays = t.created_at && t.status !== 'completed' && t.status !== 'cancelled'
      ? Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000) : null
    return (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + priorityColor(t.priority), borderRadius: '10px', padding: compact ? '12px 14px' : '16px 18px', marginBottom: compact ? '8px' : '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{t.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{t.properties?.address}{t.tenants ? ' · ' + t.tenants.full_name : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0, marginLeft: '8px' }}>
          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: priorityBg(t.priority), color: priorityColor(t.priority), fontWeight: 700, textTransform: 'uppercase' }}>{t.priority}</span>
          <span className={'chip ' + chipClass(t.status)} style={{ textTransform: 'capitalize' }}>{t.status?.replace('_', ' ')}</span>
        </div>
      </div>
      {!compact && t.description && <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px', lineHeight: 1.5 }}>{t.description}</div>}
      <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text3)', marginBottom: '10px', flexWrap: 'wrap' }}>
        {ageDays !== null && <span style={{ color: ageDays > 7 ? 'var(--red)' : 'var(--text3)', fontWeight: ageDays > 7 ? 600 : 400 }}>⏱ {ageDays}d open</span>}
        {t.category && <span>📂 {t.category.replace('_', ' ')}</span>}
        {t.scheduled_date && <span>📅 {formatDate(t.scheduled_date)}</span>}
        {t.actual_cost && <span>💰 {fm(t.actual_cost)}</span>}
        {t.estimated_cost && !t.actual_cost && <span>Est: {fm(t.estimated_cost)}</span>}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <a href={'/maintenance/' + t.id} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', textDecoration: 'none' }}>View</a>
        <a href={'/maintenance/' + t.id + '/edit'} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', textDecoration: 'none' }}>Edit</a>
        {t.status !== 'completed' && <button onClick={() => updateStatus(t.id, 'completed')} style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '0.5px solid var(--green)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>✓ Complete</button>}
        {t.status === 'open' && <button onClick={() => updateStatus(t.id, 'in_progress')} style={{ background: '#A78BFA22', color: '#A78BFA', border: '0.5px solid #A78BFA', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>→ In Progress</button>}
        <button onClick={() => deleteTicket(t.id)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
      </div>
    </div>
    )
  }

  const boardCols = [
    { key: 'open', label: '🔴 Open', color: 'var(--amber)' },
    { key: 'scheduled', label: '📅 Scheduled', color: 'var(--blue)' },
    { key: 'in_progress', label: '🔄 In Progress', color: '#A78BFA' },
    { key: 'completed', label: '✅ Completed', color: 'var(--green)' },
  ]

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Maintenance</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '8px', padding: '3px', border: '0.5px solid var(--border)' }}>
            <button onClick={() => setView('list')} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: view === 'list' ? 'var(--bg2)' : 'transparent', color: view === 'list' ? 'var(--text)' : 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontWeight: view === 'list' ? 600 : 400 }}>☰ List</button>
            <button onClick={() => setView('board')} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: view === 'board' ? 'var(--bg2)' : 'transparent', color: view === 'board' ? 'var(--text)' : 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontWeight: view === 'board' ? 600 : 400 }}>⊞ Board</button>
          </div>
          <a href='/maintenance/new' className='btn btn-primary'>+ New Request</a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '🔴 Open', value: open, color: 'var(--amber)', filterVal: 'open' },
          { label: '🔄 In Progress', value: inProgress, color: '#A78BFA', filterVal: 'in_progress' },
          { label: '✅ Completed', value: completed, color: 'var(--green)', filterVal: 'completed' },
          { label: '💰 Total Cost', value: fm(totalCost), color: 'var(--red)', filterVal: null },
        ].map((mc, i) => (
          <button key={mc.label} onClick={() => mc.filterVal && setFilter(filter === mc.filterVal ? 'all' : mc.filterVal)} style={{ padding: '14px 20px', background: filter === mc.filterVal ? mc.color + '15' : 'var(--bg2)', border: 'none', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none', cursor: mc.filterVal ? 'pointer' : 'default', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }}>
          <option value='all'>All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
        {['all','open','scheduled','in_progress','completed','cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px', border: '0.5px solid var(--border2)', background: filter === f ? 'var(--green)' : 'transparent', color: filter === f ? '#fff' : 'var(--text2)', cursor: 'pointer', fontWeight: filter === f ? 700 : 400, textTransform: 'capitalize' }}>{f.replace('_',' ')}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔧</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '16px' }}>No maintenance requests</div>
            <a href='/maintenance/new' style={{ background: 'var(--green)', color: '#fff', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Request</a>
          </div>
        )}
        {!loading && filtered.length > 0 && view === 'list' && (
          <div style={{ display: 'grid', gap: '10px' }}>
            {filtered.map(t => <TicketCard key={t.id} t={t} />)}
          </div>
        )}
        {!loading && view === 'board' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', alignItems: 'start' }}>
            {boardCols.map(col => {
              const colTickets = tickets.filter(t => {
                const statusMatch = col.key === 'in_progress' ? (t.status === 'in_progress' || t.status === 'scheduled') : t.status === col.key
                const propMatch = propFilter === 'all' || t.property_id === propFilter
                return statusMatch && propMatch
              })
              return (
                <div key={col.key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: col.color }}>{col.label}</div>
                    <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: col.color + '22', color: col.color, fontWeight: 700 }}>{colTickets.length}</span>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {colTickets.length === 0 ? (
                      <div style={{ background: 'var(--bg2)', border: '0.5px dashed var(--border2)', borderRadius: '10px', padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: '12px' }}>No tickets</div>
                    ) : colTickets.map(t => <TicketCard key={t.id} t={t} compact={true} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}