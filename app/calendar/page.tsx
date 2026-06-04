'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function CalendarPage() {
  const [events, setEvents] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewDate, setViewDate] = useState(null)
  const [showAdd, setShowAdd] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [view, setView] = useState('month')

  useEffect(() => {
    supabase.from('reminders').select('*')
      .then(({ data }) => setReminders(data || []))
  }, [])

  useEffect(() => {
    const y = currentDate.getFullYear()
    const mo = currentDate.getMonth() + 1
    const pad = n => String(n).padStart(2, '0')
    const monthPrefix = y + '-' + pad(mo)
    const dim = new Date(y, mo, 0).getDate()
    const todayStr = new Date().toISOString().split('T')[0]
    Promise.all([
      supabase.from('leases').select('*, tenants(full_name), properties(address)').eq('status', 'executed'),
      supabase.from('payments').select('lease_id, status').gte('due_date', monthPrefix + '-01').lte('due_date', monthPrefix + '-31'),
      supabase.from('maintenance').select('*, properties(address)').not('scheduled_date', 'is', null).in('status', ['open','scheduled','in_progress']),
      supabase.from('mortgages').select('*, properties(address)').eq('is_paid_off', false),
    ]).then(([lea, pay, mai, mor]) => {
      const ev = []
      lea.data?.forEach(l => {
        // Recurring rent due, projected onto every month from the lease's due_day
        if (l.due_day) {
          const dateStr = monthPrefix + '-' + pad(Math.min(l.due_day, dim))
          const isPaid = pay.data?.some(p => p.lease_id === l.id && p.status === 'paid')
          const state = isPaid ? 'Paid' : (dateStr < todayStr ? 'Overdue' : 'Due')
          ev.push({ date: dateStr, label: (l.tenants?.full_name || 'Tenant') + ' — Rent ' + state, amount: l.rent_amount, color: isPaid ? '#34D399' : (dateStr < todayStr ? '#F87171' : '#FBB040'), type: 'payment', link: '/payments' })
        }
        // Lease expiration (shows in whichever month it falls)
        if (l.end_date) ev.push({ date: l.end_date, label: (l.tenants?.full_name || 'Tenant') + ' — Lease Expires', amount: l.rent_amount, color: '#60A5FA', type: 'lease', link: '/leases/' + l.id })
      })
      mai.data?.forEach(m => ev.push({ date: m.scheduled_date, label: m.title + ' — ' + (m.properties?.address || ''), color: '#A78BFA', type: 'maintenance', link: '/maintenance/' + m.id }))
      mor.data?.forEach(mt => {
        const dateStr = monthPrefix + '-' + pad(Math.min(mt.due_day || 1, dim))
        ev.push({ date: dateStr, label: (mt.properties?.address || 'Property') + ' — Mortgage', amount: mt.monthly_payment, color: '#9CA3AF', type: 'mortgage', link: '/mortgage' })
      })
      setEvents(ev)
      setLoading(false)
    })
  }, [currentDate])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const pad = n => String(n).padStart(2, '0')

  const getEventsForDay = (day) => {
    const dateStr = year + '-' + pad(month + 1) + '-' + pad(day)
    return [...events.filter(e => e.date === dateStr), ...reminders.filter(r => r.date === dateStr)]
  }

  const today = new Date()
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const upcomingEvents = [...events, ...reminders.map(r => ({ ...r, label: r.title }))]
    .filter(e => (e.date || '') >= today.toISOString().split('T')[0])
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 10)

  async function saveReminder() {
    if (!newTitle.trim()) return
    const { data } = await supabase.from('reminders').insert({ date: showAdd, title: newTitle, color: '#A78BFA' }).select().single()
    if (data) setReminders(prev => [...prev, data])
    setShowAdd(null)
    setNewTitle('')
  }

  async function deleteReminder(id) {
    await supabase.from('reminders').delete().eq('id', id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  // Generate a 12-month .ics calendar (recurring rent + mortgages, lease ends,
  // scheduled maintenance, reminders) and download it for Google/Apple Calendar.
  async function exportICS() {
    const [lea, mor, mai] = await Promise.all([
      supabase.from('leases').select('*, tenants(full_name), properties(address)').eq('status', 'executed'),
      supabase.from('mortgages').select('*, properties(address)').eq('is_paid_off', false),
      supabase.from('maintenance').select('*, properties(address)').not('scheduled_date', 'is', null).in('status', ['open','scheduled','in_progress']),
    ])
    const p2 = n => String(n).padStart(2, '0')
    const esc = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
    const nextDay = ds => { const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + 1); return '' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) }
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PropManager Pro//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:PropManager Pro']
    const ev = (uid, ds, summary) => L.push('BEGIN:VEVENT', 'UID:' + uid + '@propmanager-pro', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + ds.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + nextDay(ds), 'SUMMARY:' + esc(summary), 'END:VEVENT')
    const base = new Date()
    for (let k = 0; k < 12; k++) {
      const d = new Date(base.getFullYear(), base.getMonth() + k, 1)
      const yy = d.getFullYear(), mm = d.getMonth() + 1
      const dim = new Date(yy, mm, 0).getDate()
      const pre = yy + '-' + p2(mm)
      lea.data?.forEach(l => { if (l.due_day) ev('rent-' + l.id + '-' + pre, pre + '-' + p2(Math.min(l.due_day, dim)), 'Rent Due — ' + (l.tenants?.full_name || 'Tenant') + ' (' + fm(l.rent_amount) + ')') })
      mor.data?.forEach(m => ev('mort-' + m.id + '-' + pre, pre + '-' + p2(Math.min(m.due_day || 1, dim)), 'Mortgage — ' + (m.properties?.address || 'Property')))
    }
    lea.data?.forEach(l => { if (l.end_date) ev('lease-' + l.id, l.end_date, 'Lease Expires — ' + (l.tenants?.full_name || 'Tenant')) })
    mai.data?.forEach(m => ev('maint-' + m.id, m.scheduled_date, 'Maintenance — ' + m.title))
    reminders.forEach(r => { if (r.date) ev('rem-' + r.id, r.date, r.title) })
    L.push('END:VCALENDAR')
    const blob = new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'propmanager-calendar.ics'; a.click()
    URL.revokeObjectURL(url)
  }

  const viewDateEvents = viewDate ? [...events.filter(e => e.date === viewDate), ...reminders.filter(r => r.date === viewDate)] : []
  const monthPrefix = year + '-' + pad(month + 1)
  const agendaItems = [...events, ...reminders.filter(r => (r.date || '').startsWith(monthPrefix)).map(r => ({ ...r, label: r.title }))]
    .filter(e => (e.date || '').startsWith(monthPrefix))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Calendar</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={prevMonth} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>←</button>
          <select value={month} onChange={e => setCurrentDate(new Date(year, parseInt(e.target.value), 1))} style={{ padding: '6px 10px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', fontWeight: 600 }}>
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setCurrentDate(new Date(parseInt(e.target.value), month, 1))} style={{ padding: '6px 10px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', fontWeight: 600 }}>
            {[2023,2024,2025,2026,2027,2028,2029,2030].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={nextMonth} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>→</button>
          <button onClick={() => setCurrentDate(new Date())} className='btn btn-ghost'>Today</button>
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '8px', padding: '3px', border: '0.5px solid var(--border)' }}>
            {['month', 'agenda'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: view === v ? 'var(--bg2)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontWeight: view === v ? 600 : 400, textTransform: 'capitalize' }}>{v}</button>
            ))}
          </div>
          <button onClick={exportICS} className='btn btn-ghost'>⤓ Export</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
        {view === 'month' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ padding: '8px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'center' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={'e'+i} style={{ minHeight: '80px', background: 'var(--bg3)', borderRadius: '6px', opacity: 0.3 }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayEvents = getEventsForDay(day)
              const dateStr = year + '-' + pad(month + 1) + '-' + pad(day)
              return (
                <div key={day} onClick={() => setViewDate(dateStr)} style={{ minHeight: '80px', background: isToday(day) ? 'var(--green-bg)' : 'var(--bg2)', border: isToday(day) ? '1.5px solid var(--green)' : '0.5px solid var(--border)', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>
                  <div style={{ fontSize: '12px', fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? 'var(--green)' : 'var(--text2)', marginBottom: '4px' }}>{day}</div>
                  {dayEvents.slice(0, 2).map((ev, idx) => (
                    <div key={idx} style={{ fontSize: '9px', padding: '2px 4px', borderRadius: '3px', marginBottom: '2px', background: (ev.color || '#A78BFA') + '33', color: ev.color || '#A78BFA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {ev.label || ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && <div style={{ fontSize: '9px', color: 'var(--text3)' }}>+{dayEvents.length - 2} more</div>}
                </div>
              )
            })}
          </div>
        </div>
        )}
        {view === 'agenda' && (
          <div style={{ gridColumn: '1 / -1' }}>
            {agendaItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)', fontSize: '13px' }}>No events this month. Use ← → to change month.</div>
            ) : agendaItems.map((ev, i) => (
              <a key={i} href={ev.link || '#'} onClick={!ev.link ? e => e.preventDefault() : undefined} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + (ev.color || '#A78BFA'), borderRadius: '10px', padding: '12px 16px', marginBottom: '8px', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ textAlign: 'center', minWidth: '44px', flexShrink: 0 }}>
                  <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>{new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: ev.color || 'var(--text)', lineHeight: 1.1 }}>{new Date(ev.date + 'T12:00:00').getDate()}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text3)' }}>{new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{ev.label || ev.title}</div>
                  {ev.amount ? <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{fm(ev.amount)}</div> : null}
                </div>
              </a>
            ))}
          </div>
        )}
        {view === 'month' && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }}>Upcoming Events</div>
          {loading && <div style={{ color: 'var(--text3)', fontSize: '12px' }}>Loading...</div>}
          {upcomingEvents.map((ev, i) => (
            <a key={i} href={ev.link || '#'} onClick={!ev.link ? e => e.preventDefault() : undefined} style={{ display: 'block', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + (ev.color || '#A78BFA'), borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', textDecoration: 'none' }}>
              <div style={{ fontSize: '10px', color: ev.color || '#A78BFA', fontWeight: 600, marginBottom: '2px' }}>{ev.date}</div>
              <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{ev.label || ev.title}</div>
              {ev.amount && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{fm(ev.amount)}</div>}
            </a>
          ))}
        </div>
        )}
      </div>

      {viewDate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setViewDate(null)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '380px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                {new Date(viewDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <button onClick={() => setViewDate(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text2)', lineHeight: 1 }}>×</button>
            </div>
            {viewDateEvents.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px', textAlign: 'center', padding: '20px 0' }}>No events on this day.</div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                {viewDateEvents.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg3)', borderRadius: '8px', marginBottom: '6px', border: '0.5px solid var(--border)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ev.color || '#A78BFA', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      {ev.link ? <a href={ev.link} style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, textDecoration: 'none' }}>{ev.label || ev.title}</a> : <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>{ev.label || ev.title}</span>}
                    </div>
                    {ev.id && !ev.link && <button onClick={() => deleteReminder(ev.id)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: 'none', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setShowAdd(viewDate); setViewDate(null) }} style={{ width: '100%', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Reminder</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAdd(null)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '340px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Add Reminder</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>{showAdd}</div>
            <input autoFocus style={{ width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }} placeholder='e.g. Call insurance agent...' value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveReminder()} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(null)} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveReminder} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}