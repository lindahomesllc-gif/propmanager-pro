'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function NewApplicationPage() {
  const [properties, setProperties] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    property_id: '', applicant_name: '', email: '', phone: '',
    desired_move_in: '', monthly_income: '', employer_name: '',
    previous_landlord_name: '', previous_landlord_phone: '',
    previous_rent: '', reason_for_moving: '',
    has_pets: false, pet_description: '',
    has_eviction_history: false, eviction_explanation: '',
  })

  useEffect(() => {
    supabase.from('properties').select('id, address')
      .then(({ data }) => setProperties(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.property_id) { setError('Please select a property'); return }
    if (!form.applicant_name) { setError('Applicant name is required'); return }
    if (!form.email) { setError('Email is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('applications').insert({
      property_id: form.property_id,
      applicant_name: form.applicant_name,
      email: form.email,
      phone: form.phone || null,
      desired_move_in: form.desired_move_in || null,
      monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
      employer_name: form.employer_name || null,
      previous_landlord_name: form.previous_landlord_name || null,
      previous_landlord_phone: form.previous_landlord_phone || null,
      previous_rent: form.previous_rent ? parseFloat(form.previous_rent) : null,
      reason_for_moving: form.reason_for_moving || null,
      has_pets: form.has_pets,
      pet_description: form.pet_description || null,
      has_eviction_history: form.has_eviction_history,
      eviction_explanation: form.eviction_explanation || null,
      status: 'received',
    })
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/applications'
  }

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href='/applications' style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Applications</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>New Application</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href='/applications' className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Submit Application'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Property</div>
          <select className='input' value={form.property_id} onChange={e => set('property_id', e.target.value)}>
            <option value=''>Select property...</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
        </div>
        <div style={card}>
          <div style={secTtl}>Applicant Info</div>
          <div style={{ marginBottom: '12px' }}><label style={lbl}>Full Name *</label><input className='input' value={form.applicant_name} onChange={e => set('applicant_name', e.target.value)} /></div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Email *</label><input className='input' type='email' value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label style={lbl}>Phone</label><input className='input' value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div style={g2}>
            <div><label style={lbl}>Desired Move In</label><input className='input' type='date' value={form.desired_move_in} onChange={e => set('desired_move_in', e.target.value)} /></div>
            <div><label style={lbl}>Monthly Income</label><input className='input' type='number' placeholder='0.00' value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Employment</div>
          <div><label style={lbl}>Employer Name</label><input className='input' value={form.employer_name} onChange={e => set('employer_name', e.target.value)} /></div>
        </div>
        <div style={card}>
          <div style={secTtl}>Rental History</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Previous Landlord</label><input className='input' value={form.previous_landlord_name} onChange={e => set('previous_landlord_name', e.target.value)} /></div>
            <div><label style={lbl}>Landlord Phone</label><input className='input' value={form.previous_landlord_phone} onChange={e => set('previous_landlord_phone', e.target.value)} /></div>
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Previous Rent</label><input className='input' type='number' value={form.previous_rent} onChange={e => set('previous_rent', e.target.value)} /></div>
            <div><label style={lbl}>Reason for Moving</label><input className='input' value={form.reason_for_moving} onChange={e => set('reason_for_moving', e.target.value)} /></div>
          </div>
          <div style={{ ...g2 }}>
            <div><label style={lbl}>Pets</label>
              <select className='input' value={form.has_pets ? 'true' : 'false'} onChange={e => set('has_pets', e.target.value === 'true')}>
                <option value='false'>No Pets</option>
                <option value='true'>Has Pets</option>
              </select>
            </div>
            <div><label style={lbl}>Eviction History</label>
              <select className='input' value={form.has_eviction_history ? 'true' : 'false'} onChange={e => set('has_eviction_history', e.target.value === 'true')}>
                <option value='false'>No</option>
                <option value='true'>Yes</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href='/applications' className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Submit Application'}</button>
        </div>
      </div>
    </AppShell>
  )
}