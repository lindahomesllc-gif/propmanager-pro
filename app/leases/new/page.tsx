'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function NewLeasePage() {
  const [tenants, setTenants] = useState([])
  const [properties, setProperties] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    property_id: '', tenant_id: '',
    rent_amount: '', security_deposit: '', pet_deposit: '0',
    start_date: '', end_date: '',
    due_day: '1', grace_period_days: '5',
    late_fee_amount: '50', late_fee_type: 'flat',
    lease_type: 'fixed', pet_policy: 'none',
    parking_spaces: '0', special_clauses: '',
    status: 'draft'
  })

  useEffect(() => {
    Promise.all([
      supabase.from('properties').select('id, address').eq('user_id', USER_ID),
      supabase.from('tenants').select('id, full_name, property_id').eq('user_id', USER_ID).eq('status', 'active'),
    ]).then(([p, t]) => {
      setProperties(p.data || [])
      setTenants(t.data || [])
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (form.property_id) {
      const t = tenants.find(x => x.property_id === form.property_id)
      if (t) set('tenant_id', t.id)
    }
  }, [form.property_id])

  async function save() {
    setError('')
    if (!form.property_id) { setError('Please select a property'); return }
    if (!form.tenant_id) { setError('Please select a tenant'); return }
    if (!form.rent_amount) { setError('Rent amount is required'); return }
    if (!form.start_date) { setError('Start date is required'); return }
    if (!form.end_date) { setError('End date is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('leases').insert({
      user_id: USER_ID,
      property_id: form.property_id,
      tenant_id: form.tenant_id,
      rent_amount: parseFloat(form.rent_amount),
      security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
      pet_deposit: parseFloat(form.pet_deposit) || 0,
      start_date: form.start_date,
      end_date: form.end_date,
      due_day: parseInt(form.due_day),
      grace_period_days: parseInt(form.grace_period_days),
      late_fee_amount: parseFloat(form.late_fee_amount),
      late_fee_type: form.late_fee_type,
      lease_type: form.lease_type,
      pet_policy: form.pet_policy,
      parking_spaces: parseInt(form.parking_spaces) || 0,
      special_clauses: form.special_clauses || null,
      status: form.status,
    })
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/leases'
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const btnP = { background: 'var(--green)', color: 'var(--bg)', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
  const btnG = { background: 'transparent', color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href='/leases' style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Leases</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>New Lease</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href='/leases' style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Create Lease'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Property & Tenant</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Property *</label>
              <select style={inp} value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                <option value=''>Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Tenant *</label>
              <select style={inp} value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
                <option value=''>Select tenant...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Lease Terms</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Start Date *</label><input style={inp} type='date' value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
            <div><label style={lbl}>End Date *</label><input style={inp} type='date' value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Lease Type</label>
              <select style={inp} value={form.lease_type} onChange={e => set('lease_type', e.target.value)}>
                <option value='fixed'>Fixed Term</option>
                <option value='month_to_month'>Month to Month</option>
              </select>
            </div>
            <div><label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value='draft'>Draft</option>
                <option value='sent'>Sent</option>
                <option value='executed'>Executed</option>
              </select>
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Financial Terms</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Monthly Rent *</label><input style={inp} type='number' placeholder='1500' value={form.rent_amount} onChange={e => set('rent_amount', e.target.value)} /></div>
            <div><label style={lbl}>Security Deposit</label><input style={inp} type='number' placeholder='1500' value={form.security_deposit} onChange={e => set('security_deposit', e.target.value)} /></div>
          </div>
          <div style={{ ...g3, marginBottom: '12px' }}>
            <div><label style={lbl}>Due Day</label><input style={inp} type='number' min='1' max='28' placeholder='1' value={form.due_day} onChange={e => set('due_day', e.target.value)} /></div>
            <div><label style={lbl}>Grace Period (days)</label><input style={inp} type='number' placeholder='5' value={form.grace_period_days} onChange={e => set('grace_period_days', e.target.value)} /></div>
            <div><label style={lbl}>Late Fee</label><input style={inp} type='number' placeholder='50' value={form.late_fee_amount} onChange={e => set('late_fee_amount', e.target.value)} /></div>
          </div>
          <div style={{ ...g2 }}>
            <div><label style={lbl}>Late Fee Type</label>
              <select style={inp} value={form.late_fee_type} onChange={e => set('late_fee_type', e.target.value)}>
                <option value='flat'>Flat Amount</option>
                <option value='percent'>Percentage</option>
              </select>
            </div>
            <div><label style={lbl}>Pet Deposit</label><input style={inp} type='number' placeholder='0' value={form.pet_deposit} onChange={e => set('pet_deposit', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Other Terms</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Pet Policy</label>
              <select style={inp} value={form.pet_policy} onChange={e => set('pet_policy', e.target.value)}>
                <option value='none'>No Pets</option>
                <option value='allowed'>Pets Allowed</option>
                <option value='case_by_case'>Case by Case</option>
              </select>
            </div>
            <div><label style={lbl}>Parking Spaces</label><input style={inp} type='number' placeholder='0' value={form.parking_spaces} onChange={e => set('parking_spaces', e.target.value)} /></div>
          </div>
          <div><label style={lbl}>Special Clauses</label><textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder='Any special terms or clauses...' value={form.special_clauses} onChange={e => set('special_clauses', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href='/leases' style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Create Lease'}</button>
        </div>
      </div>
    </AppShell>
  )
}