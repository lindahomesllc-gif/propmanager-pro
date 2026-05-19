'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm } from '@/lib/supabase'

export default function CalendarPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    Promise.all([
      supabase.from('payments').select('*, tenants(full_name), properties(address)').eq('user_id', USER_ID).in('status', ['due','upcoming','late']),
      supabase.from('leases').select('*, tenants(full_name), properties(address)').eq('user_id', USER_ID).eq('status', 'executed'),
      supabase.from('maintenance').select('*, properties(address)').eq('user_id', USER_ID).not('scheduled_date', 'is', null).in('status', ['open','scheduled','in_progress']),
      supabase.from('mortgages').select('*, properties(address)').eq('user_id', USER_ID).eq('is_paid_off', false),
    ]).then(([pay, lea, mai, mor]) => {
      const ev = []
      const y = currentDate.getFullYear()
      const m = currentDate.getMonth() + 1
      const pad = n => String(n).padStart(2, '0')

      pay.data?.forEach(p => ev.push({ date: p.due_date, label: (p.tenants?.full_name || 'Tenant') + ' — Rent Due', amount: p.amount_due, color: p.status === 'late' ? 'var(--red)' : 'var(--amber)', type: 'payment', link: '/payments' }))
      lea.data?.forEach(l => { ev.push({ date: l.end_date, label: (l.tenants?.full_name || 'Tenant') + ' — Lease Expires', amount: l.rent_amount, color: 'var(--blue)', type: 'lease', link: '/leases/' + l.id }) })
      mai.data?.forEach(m => ev.push({ date: m.scheduled_date, label: m.title + ' — ' + (m.properties?.address || ''), color: '#A78BFA', type: 'maintenance', link: '/maintenance/' + m.id }))
      mor.data?.forEach(mo => {
        const date = y + '-' + pad(m) + '-' + pad(mo.due_day)
        ev.push({ date, label: (mo.properties?.address || 'Property') + ' — Mortgage', amount: mo.monthly_payment, color: '#34D399', type: 'mortgage', link: '/mortgage' })
      })
      setEvents(ev)
      setLoading(false)
    })
  }, [currentDate])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const pad = n => String(n).padStart(2, '0')
  const getEventsForDay = (day) => {
    const dateStr = year + '-' + pad(month + 1) + '-' + pad(day)
    return events.filter(e => e.date === dateStr)
  }

  const today = new Date()
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const upcomingEvents = events
    .filter(e => e.date >= today.toISOString().split('T')[0])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Calendar</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={prevMonth} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>←</button>
          <select value={month} onChange={e => setCurrentDate(new Date(year, parseInt(e.target.value), 1))} style={{ padding: '6px 10px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', fontWeight: 600 }}>
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={e => setCurrentDate(new Date(parseInt(e.target.value), month, 1))} style={{ padding: '6px 10px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', fontWeight: 600 }}>
            {[2023,2024,2025,2026,2027,2028,2029,2030].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={nextMonth} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>→</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ padding: '8px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'center' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={'empty-' + i} style={{ minHeight: '80px', background: 'var(--bg)', borderRadius: '6px' }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayEvents = getEventsForDay(day)
              return (
                <div key={day} style={{ minHeight: '80px', background: isToday(day) ? '#1E3D2A' : 'var(--bg2)', border: isToday(day) ? '0.5px solid #4ADE9A' : '0.5px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? 'var(--green)' : 'var(--text2)', marginBottom: '4px' }}>{day}</div>
                  {dayEvents.slice(0, 2).map((ev, idx) => (
                    <a key={idx} href={ev.link} style={{ display: 'block', fontSize: '9px', padding: '2px 4px', borderRadius: '3px', marginBottom: '2px', background: ev.color + '22', color: ev.color, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.label}
                    </a>
                  ))}
                  {dayEvents.length > 2 && <div style={{ fontSize: '9px', color: 'var(--text3)' }}>+{dayEvents.length - 2} more</div>}
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }}>Upcoming Events</div>
          {loading && <div style={{ color: 'var(--text3)', fontSize: '12px' }}>Loading...</div>}
          {!loading && upcomingEvents.length === 0 && <div style={{ color: 'var(--text3)', fontSize: '12px' }}>No upcoming events.</div>}
          {upcomingEvents.map((ev, i) => (
            <a key={i} href={ev.link} style={{ display: 'block', background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + ev.color, borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', textDecoration: 'none' }}>
              <div style={{ fontSize: '10px', color: ev.color, fontWeight: 600, marginBottom: '2px' }}>{ev.date}</div>
              <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{ev.label}</div>
              {ev.amount && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{fm(ev.amount)}</div>}
            </a>
          ))}
        </div>
      </div>
    </AppShell>
  )
}