'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function EditMaintenancePage({ params }) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', category: 'other',
    priority: 'medium', status: 'open',
    scheduled_date: '', estimated_cost: '',
    actual_cost: '', completed_date: '', landlord_notes: '',
  })

  useEffect(() => {
    supabase.from('maintenance').select('*').eq('id', params.id).eq('user_id', USER_ID).single()
      .then(({ data }) => {
        if (data) setForm({
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'other',
          priority: data.priority || 'medium',
          status: data.status || 'open',
          scheduled_date: data.scheduled_date || '',
          estimated_cost: data.estimated_cost ? String(data.estimated_cost) : '',
          actual_cost: data.actual_cost ? String(data.actual_cost) : '',
          completed_date: data.completed_date || '',
          landlord_notes: data.landlord_notes || '',
        })
        setLoading(false)
      })
  }, [params.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.title) { setError('Title is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('maintenance').update({
      title: form.title,
      description: form.description || null,
      category: form.category,
      priority: form.priority,
      status: form.status,
      scheduled_date: form.scheduled_date || null,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      actual_cost: form.actual_cost ? parseFloat(form.actual_cost) : null,
      completed_date: form.completed_date || null,
      landlord_notes: form.landlord_notes || null,
    }).eq('id', params.id).eq('user_id', USER_ID)
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/maintenance/' + params.id
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5A5A56', marginBottom: '4px' }
  const card = { background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const btnP = { background: '#4ADE9A', color: '#0E0E0C', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
  const btnG = { background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }

  if (loading) return <AppShell><div style={{ padding: '40px', color: '#5A5A56', textAlign: 'center' }}>Loading...</div></AppShell>

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div>
          <a href={'/maintenance/' + params.id} style={{ fontSize: '11px', color: '#5A5A56', textDecoration: 'none' }}>← Back</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8', marginTop: '2px' }}>Edit Request</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={'/maintenance/' + params.id} style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Request Details</div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Title *</label>
            <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div style={{ ...g3, marginBottom: '12px' }}>
            <div><label style={lbl}>Category</label>
              <select style={inp} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value='plumbing'>Plumbing</option>
                <option value='hvac'>HVAC</option>
                <option value='electrical'>Electrical</option>
                <option value='appliance'>Appliance</option>
                <option value='structural'>Structural</option>
                <option value='pest_control'>Pest Control</option>
                <option value='landscaping'>Landscaping</option>
                <option value='cleaning'>Cleaning</option>
                <option value='locks'>Locks</option>
                <option value='windows'>Windows</option>
                <option value='other'>Other</option>
              </select>
            </div>
            <div><label style={lbl}>Priority</label>
              <select style={inp} value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value='low'>Low</option>
                <option value='medium'>Medium</option>
                <option value='high'>High</option>
                <option value='emergency'>Emergency</option>
              </select>
            </div>
            <div><label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value='open'>Open</option>
                <option value='scheduled'>Scheduled</option>
                <option value='in_progress'>In Progress</option>
                <option value='completed'>Completed</option>
                <option value='cancelled'>Cancelled</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Description</label>
            <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Scheduling & Cost</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Scheduled Date</label><input style={inp} type='date' value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} /></div>
            <div><label style={lbl}>Completed Date</label><input style={inp} type='date' value={form.completed_date} onChange={e => set('completed_date', e.target.value)} /></div>
          </div>
          <div style={g2}>
            <div><label style={lbl}>Estimated Cost</label><input style={inp} type='number' value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} /></div>
            <div><label style={lbl}>Actual Cost</label><input style={inp} type='number' value={form.actual_cost} onChange={e => set('actual_cost', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Notes</div>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={form.landlord_notes} onChange={e => set('landlord_notes', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href={'/maintenance/' + params.id} style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </AppShell>
  )
}