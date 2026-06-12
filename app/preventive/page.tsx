'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, formatDate } from '@/lib/supabase'

// Preventive / recurring maintenance scheduler — keeps filters, gutters, batteries,
// inspections on a cadence and surfaces what's due in the dashboard's Needs Attention.
const TEMPLATES: { title: string; interval: number }[] = [
  { title: 'HVAC filter change', interval: 3 },
  { title: 'Pest control', interval: 3 },
  { title: 'Gutter cleaning', interval: 6 },
  { title: 'HVAC service / tune-up', interval: 12 },
  { title: 'Smoke / CO detector batteries', interval: 12 },
  { title: 'Dryer vent cleaning', interval: 12 },
  { title: 'Roof / gutter inspection', interval: 12 },
]
const INTERVALS: { v: number; l: string }[] = [
  { v: 1, l: 'Monthly' }, { v: 2, l: 'Every 2 months' }, { v: 3, l: 'Quarterly' }, { v: 6, l: 'Every 6 months' }, { v: 12, l: 'Yearly' }, { v: 24, l: 'Every 2 years' },
]
const blankForm = { title: '', property_id: '', interval_months: 3, next_due: new Date().toISOString().slice(0, 10), notes: '' }
const todayStr = () => new Date().toISOString().slice(0, 10)
function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr + 'T00:00:00'); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10)
}

export default function PreventivePage() {
  const [items, setItems] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<any>(blankForm)

  async function load() {
    const { data } = await supabase.from('maintenance_schedules').select('*, properties(address)').eq('active', true).order('next_due')
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => {
    supabase.from('properties').select('id, address').order('address').then(({ data }) => setProperties(data || []))
    load()
  }, [])

  function openAdd(tpl?: { title: string; interval: number }) {
    setEditId(null)
    setForm({ ...blankForm, title: tpl?.title || '', interval_months: tpl?.interval || 3, next_due: tpl ? addMonths(todayStr(), tpl.interval) : todayStr() })
    setError(''); setShowForm(true)
  }
  function openEdit(it: any) {
    setEditId(it.id)
    setForm({ title: it.title || '', property_id: it.property_id || '', interval_months: it.interval_months || 3, next_due: it.next_due || todayStr(), notes: it.notes || '' })
    setError(''); setShowForm(true)
  }

  async function save() {
    if (!form.title.trim()) { setError('Give the task a name'); return }
    setSaving(true); setError('')
    const payload: any = {
      title: form.title.trim(), property_id: form.property_id || null,
      interval_months: parseInt(form.interval_months) || 3, next_due: form.next_due || null, notes: form.notes || null,
    }
    const { error: err } = editId
      ? await supabase.from('maintenance_schedules').update(payload).eq('id', editId)
      : await supabase.from('maintenance_schedules').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowForm(false); load()
  }

  async function markDone(it: any) {
    const next = addMonths(todayStr(), it.interval_months || 3)
    const { error } = await supabase.from('maintenance_schedules').update({ last_done: todayStr(), next_due: next }).eq('id', it.id)
    if (error) { alert('Error: ' + error.message); return }
    load()
  }
  async function del(it: any) {
    if (!confirm('Delete the recurring task “' + it.title + '”?')) return
    const { error } = await supabase.from('maintenance_schedules').update({ active: false }).eq('id', it.id)
    if (error) { alert('Error: ' + error.message); return }
    load()
  }

  const daysTo = (d: string) => Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000)
  const overdue = items.filter(i => i.next_due && daysTo(i.next_due) < 0)
  const dueSoon = items.filter(i => i.next_due && daysTo(i.next_due) >= 0 && daysTo(i.next_due) <= 30)

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const panel = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }
  const intLabel = (m: number) => INTERVALS.find(x => x.v === m)?.l || ('Every ' + m + ' mo')

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🔁 Preventive Maintenance</div>
        <button onClick={() => openAdd()} className='btn btn-primary'>+ Add Task</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', maxWidth: '680px' }}>
          Put recurring upkeep on autopilot — filters, gutters, detector batteries, inspections. What&apos;s due shows up in your dashboard&apos;s <strong>Needs Attention</strong>, and <strong>Mark done</strong> rolls it to the next cycle.
        </div>

        {/* quick templates */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {TEMPLATES.map(t => (
            <button key={t.title} onClick={() => openAdd(t)} style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '20px', border: '0.5px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer' }}>+ {t.title} <span style={{ color: 'var(--text3)' }}>· {intLabel(t.interval)}</span></button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2].map(i => <div key={i} className='skeleton' style={{ height: '56px' }} />)}</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔁</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>No recurring tasks yet</div>
            <div style={{ fontSize: '13px' }}>Tap a suggestion above, or <strong>+ Add Task</strong>.</div>
          </div>
        ) : (
          <>
            {(overdue.length > 0 || dueSoon.length > 0) && (
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px' }}>
                {overdue.length > 0 && <span style={{ color: 'var(--red)', fontWeight: 600 }}>{overdue.length} overdue</span>}
                {overdue.length > 0 && dueSoon.length > 0 && <span style={{ color: 'var(--text3)' }}> · </span>}
                {dueSoon.length > 0 && <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{dueSoon.length} due within 30 days</span>}
              </div>
            )}
            <div style={panel}>
              {items.map(it => {
                const d = it.next_due ? daysTo(it.next_due) : null
                const chip = d == null ? null : d < 0 ? { c: 'chip-r', l: 'Overdue' } : d <= 30 ? { c: 'chip-a', l: 'In ' + d + 'd' } : { c: 'chip-g', l: 'In ' + d + 'd' }
                return (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{it.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{intLabel(it.interval_months)} · {it.properties?.address || 'All properties'}{it.next_due ? ' · due ' + formatDate(it.next_due) : ''}{it.last_done ? ' · last ' + formatDate(it.last_done) : ''}</div>
                    </div>
                    {chip && <span className={'chip ' + chip.c}>{chip.l}</span>}
                    <button onClick={() => markDone(it)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>✓ Done</button>
                    <button onClick={() => openEdit(it)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 10px' }}>Edit</button>
                    <button onClick={() => del(it)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '440px', maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{editId ? 'Edit Task' : 'Recurring Task'}</div>
            {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '12px', padding: '10px 14px', borderRadius: '7px', marginBottom: '12px' }}>{error}</div>}
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Task *</label>
              <input style={inp} placeholder='HVAC filter change' value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>How often</label>
                <select style={inp} value={form.interval_months} onChange={e => setForm((f: any) => ({ ...f, interval_months: e.target.value }))}>
                  {INTERVALS.map(x => <option key={x.v} value={x.v}>{x.l}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Next due</label><input style={inp} type='date' value={form.next_due} onChange={e => setForm((f: any) => ({ ...f, next_due: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Property (optional)</label>
              <select style={inp} value={form.property_id} onChange={e => setForm((f: any) => ({ ...f, property_id: e.target.value }))}>
                <option value=''>All properties</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className='btn btn-ghost'>Cancel</button>
              <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Saving…' : editId ? 'Save' : 'Add Task'}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
