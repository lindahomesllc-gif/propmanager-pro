'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function EditTenantPage({ params }) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    unit_address: '', full_name: '', email: '', phone: '',
    move_in_date: '', move_out_date: '',
    status: 'active', portal_access: true,
    emergency_contact_name: '', emergency_contact_phone: '',
    notes: '',
    co_tenant_name: '', co_tenant_email: '', co_tenant_phone: '',
    minor_names: ''
  })

  useEffect(() => {
    supabase.from('tenants').select('*').eq('id', params.id).eq('user_id', USER_ID).single()
      .then(({ data }) => {
        if (data) setForm({
          unit_address: data.unit_address || '',
          unit_address: data.unit_address || '',
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          move_in_date: data.move_in_date || '',
          move_out_date: data.move_out_date || '',
          status: data.status || 'active',
          portal_access: data.portal_access ?? true,
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          notes: data.notes || '',
          co_tenant_name: data.co_tenant_name || '',
          co_tenant_email: data.co_tenant_email || '',
          co_tenant_phone: data.co_tenant_phone || '',
          minor_names: data.minor_names || '',
        })
        setLoading(false)
      })
  }, [params.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.full_name) { setError('Name is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('tenants').update({
      unit_address: form.unit_address || null,
      unit_address: form.unit_address || null,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      move_in_date: form.move_in_date || null,
      move_out_date: form.move_out_date || null,
      status: form.status,
      portal_access: form.portal_access,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      notes: form.notes || null,
      co_tenant_name: form.co_tenant_name || null,
      co_tenant_email: form.co_tenant_email || null,
      co_tenant_phone: form.co_tenant_phone || null,
      minor_names: form.minor_names || null,
    }).eq('id', params.id).eq('user_id', USER_ID)
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/tenants/' + params.id
  }

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href={'/tenants/' + params.id} style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Back to Tenant</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>Edit Tenant</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={'/tenants/' + params.id} className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Tenant Information</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Full Name *</label><input className='input' value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
            <div><label style={lbl}>Unit Address</label><input className='input' placeholder='e.g. 2515 Ridgewood Ave' value={form.unit_address} onChange={e => set('unit_address', e.target.value)} /></div>
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Email</label><input className='input' type='email' value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label style={lbl}>Phone</label><input className='input' value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Move In Date</label><input className='input' type='date' value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} /></div>
            <div><label style={lbl}>Move Out Date</label><input className='input' type='date' value={form.move_out_date} onChange={e => set('move_out_date', e.target.value)} /></div>
          </div>
          <div style={g2}>
            <div><label style={lbl}>Status</label>
              <select className='input' value={form.status} onChange={e => set('status', e.target.value)}>
                <option value='active'>Active</option>
                <option value='past'>Past</option>
                <option value='applicant'>Applicant</option>
              </select>
            </div>
            <div><label style={lbl}>Portal Access</label>
              <select className='input' value={form.portal_access ? 'true' : 'false'} onChange={e => set('portal_access', e.target.value === 'true')}>
                <option value='true'>Yes</option>
                <option value='false'>No</option>
              </select>
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Emergency Contact</div>
          <div style={g2}>
            <div><label style={lbl}>Name</label><input className='input' value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></div>
            <div><label style={lbl}>Phone</label><input className='input' value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Co-Tenant / Occupants</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Co-Tenant Name</label><input className='input' placeholder='Full name' value={form.co_tenant_name} onChange={e => set('co_tenant_name', e.target.value)} /></div>
            <div><label style={lbl}>Co-Tenant Phone</label><input className='input' placeholder='Phone' value={form.co_tenant_phone} onChange={e => set('co_tenant_phone', e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: '12px' }}><label style={lbl}>Co-Tenant Email</label><input className='input' placeholder='Email' value={form.co_tenant_email} onChange={e => set('co_tenant_email', e.target.value)} /></div>
          <div><label style={lbl}>Minors / Other Occupants</label><input className='input' placeholder='e.g. John Jr. (age 8), Sarah (age 5)' value={form.minor_names} onChange={e => set('minor_names', e.target.value)} /></div>
        </div>
        <div style={card}>
          <div style={secTtl}>Notes</div>
          <textarea className='input' style={{ resize: 'vertical' }} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href={'/tenants/' + params.id} className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </AppShell>
  )
}