'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'

const SUPABASE_URL = 'https://sugfedlfmvmbcnblhnuc.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1Z2ZlZGxmbXZtYmNuYmxobnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzAxNDMsImV4cCI6MjA5MzE0NjE0M30.H5XZES1K9abTV2QVYYi0NG6SfGFSJEq-lfmKiva8ihw'
const USER_ID = 'cacb3a74-75d7-4e07-af71-6db4fdde9a92'

async function dbGet(table: string, filters = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}&apikey=${SUPABASE_KEY}`, {
    headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }
  })
  return res.json()
}

async function dbInsert(table: string, data: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?apikey=${SUPABASE_KEY}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  })
  const json = await res.json()
  if (!res.ok) {
    console.error('Insert error:', JSON.stringify(json))
    throw new Error(json?.message || json?.[0]?.message || 'Insert failed')
  }
  return json
}

export default function NewTenantPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    property_id: '', full_name: '', email: '',
    phone: '', move_in_date: '', notes: ''
  })

  useEffect(() => {
    dbGet('properties', `user_id=eq.${USER_ID}&select=id,address`).then(data => {
      if (Array.isArray(data)) setProperties(data)
    })
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.full_name) { setError('Name is required'); return }
    if (!form.property_id) { setError('Please select a property'); return }
    setSaving(true)
    try {
      await dbInsert('tenants', {
        user_id: USER_ID,
        property_id: form.property_id,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        move_in_date: form.move_in_date || null,
        status: 'active',
        portal_access: true,
        notes: form.notes || null,
      })
      window.location.href = '/tenants'
    } catch (e: any) {
      setError(e.message || 'Error saving tenant. Please try again.')
      setSaving(false)
    }
  }

  const inp: any = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5A5A56', marginBottom: '4px' }
  const card: any = { background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const btnP: any = { background: '#4ADE9A', color: '#0E0E0C', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
  const btnG: any = { background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const secTtl: any = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Add New Tenant</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/tenants" style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Tenant'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Assign to Property</div>
          <label style={lbl}>Property *</label>
          <select style={inp} value={form.property_id} onChange={e => set('property_id', e.target.value)}>
            <option value="">Select a property...</option>
            {properties.map((p: any) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          {properties.length === 0 && <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '6px' }}>Loading properties...</div>}
        </div>
        <div style={card}>
          <div style={secTtl}>Tenant Information</div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Full Name *</label>
            <input style={inp} placeholder="John Smith" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Email</label><input style={inp} type="email" placeholder="john@email.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label style={lbl}>Phone</label><input style={inp} placeholder="407-555-0100" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div>
            <label style={lbl}>Move In Date</label>
            <input style={inp} type="date" value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Notes</div>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder="Any notes about this tenant..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href="/tenants" style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Tenant'}</button>
        </div>
      </div>
    </AppShell>
  )
}
