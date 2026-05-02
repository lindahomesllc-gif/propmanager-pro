'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function NewTenantPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [form, setForm] = useState({
    property_id: '', full_name: '', email: '',
    phone: '', move_in_date: '', notes: ''
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    supabase.from('properties').select('id,address')
      .eq('user_id', USER_ID)
      .then(({ data }) => setProperties(data || []))
  }, [])

  async function save() {
    if (!form.full_name) { alert('Name is required'); return }
    if (!form.property_id) { alert('Please select a property'); return }
    setSaving(true)
    const { error } = await supabase.from('tenants').insert({
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
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    router.push('/tenants')
  }

  const inp: any = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5A5A56', marginBottom: '4px' }
  const card: any = { background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const btnP: any = { background: '#4ADE9A', color: '#0E0E0C', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
  const btnG: any = { background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer' }
  const secTtl: any = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Add New Tenant</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btnG} onClick={() => router.push('/tenants')}>Cancel</button>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Tenant'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={card}>
          <div style={secTtl}>Assign to Property</div>
          <label style={lbl}>Property *</label>
          <select style={inp} value={form.property_id} onChange={e => set('property_id', e.target.value)}>
            <option value="">Select a property...</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
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
          <button style={btnG} onClick={() => router.push('/tenants')}>Cancel</button>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Tenant'}</button>
        </div>
      </div>
    </AppShell>
  )
}
