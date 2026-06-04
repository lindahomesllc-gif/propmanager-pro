'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function NewTenantPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    property_id: '', full_name: '', email: '',
    phone: '', move_in_date: '', notes: ''
  })

  useEffect(() => {
    supabase.from('properties').select('id, address').then(({ data }) => {
      if (Array.isArray(data)) setProperties(data)
    })
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.full_name) { setError('Name is required'); return }
    if (!form.property_id) { setError('Please select a property'); return }
    setSaving(true)
    const { error: err } = await supabase.from('tenants').insert({
      property_id: form.property_id,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      move_in_date: form.move_in_date || null,
      status: 'active',
      portal_access: true,
      notes: form.notes || null,
    })
    if (err) { setError(err.message || 'Error saving tenant. Please try again.'); setSaving(false); return }
    window.location.href = '/tenants'
  }

  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card: any = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const secTtl: any = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Add New Tenant</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/tenants" className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Tenant'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Assign to Property</div>
          <label style={lbl}>Property *</label>
          <select className='input' value={form.property_id} onChange={e => set('property_id', e.target.value)}>
            <option value="">Select a property...</option>
            {properties.map((p: any) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          {properties.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '6px' }}>Loading properties...</div>}
        </div>
        <div style={card}>
          <div style={secTtl}>Tenant Information</div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Full Name *</label>
            <input className='input' placeholder="John Smith" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Email</label><input className='input' type="email" placeholder="john@email.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label style={lbl}>Phone</label><input className='input' placeholder="407-555-0100" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div>
            <label style={lbl}>Move In Date</label>
            <input className='input' type="date" value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Notes</div>
          <textarea className='input' style={{ resize: 'vertical' }} rows={3} placeholder="Any notes about this tenant..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href="/tenants" className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Tenant'}</button>
        </div>
      </div>
    </AppShell>
  )
}
