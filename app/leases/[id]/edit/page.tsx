'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function EditLeasePage({ params }) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    rent_amount: '', security_deposit: '', pet_deposit: '0',
    start_date: '', end_date: '', due_day: '1',
    grace_period_days: '5', late_fee_amount: '50',
    late_fee_type: 'flat', lease_type: 'fixed',
    pet_policy: 'none', parking_spaces: '0',
    special_clauses: '', status: 'draft'
  })

  useEffect(() => {
    supabase.from('leases').select('*').eq('id', params.id).eq('user_id', USER_ID).single()
      .then(({ data }) => {
        if (data) setForm({
          rent_amount: String(data.rent_amount || ''),
          security_deposit: String(data.security_deposit || ''),
          pet_deposit: String(data.pet_deposit || '0'),
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          due_day: String(data.due_day || '1'),
          grace_period_days: String(data.grace_period_days || '5'),
          late_fee_amount: String(data.late_fee_amount || '50'),
          late_fee_type: data.late_fee_type || 'flat',
          lease_type: data.lease_type || 'fixed',
          pet_policy: data.pet_policy || 'none',
          parking_spaces: String(data.parking_spaces || '0'),
          special_clauses: data.special_clauses || '',
          status: data.status || 'draft',
        })
        setLoading(false)
      })
  }, [params.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.rent_amount) { setError('Rent amount is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('leases').update({
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
    }).eq('id', params.id).eq('user_id', USER_ID)
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/leases/' + params.id
  }

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href={'/leases/' + params.id} style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Back to Lease</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>Edit Lease</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={'/leases/' + params.id} className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Lease Terms</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Start Date</label><input className='input' type='date' value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
            <div><label style={lbl}>End Date</label><input className='input' type='date' value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
          </div>
          <div style={g2}>
            <div><label style={lbl}>Lease Type</label>
              <select className='input' value={form.lease_type} onChange={e => set('lease_type', e.target.value)}>
                <option value='fixed'>Fixed Term</option>
                <option value='month_to_month'>Month to Month</option>
              </select>
            </div>
            <div><label style={lbl}>Status</label>
              <select className='input' value={form.status} onChange={e => set('status', e.target.value)}>
                <option value='draft'>Draft</option>
                <option value='sent'>Sent</option>
                <option value='landlord_signed'>Landlord Signed</option>
                <option value='tenant_signed'>Tenant Signed</option>
                <option value='executed'>Executed</option>
                <option value='expired'>Expired</option>
                <option value='terminated'>Terminated</option>
              </select>
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Financial Terms</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Monthly Rent *</label><input className='input' type='number' value={form.rent_amount} onChange={e => set('rent_amount', e.target.value)} /></div>
            <div><label style={lbl}>Security Deposit</label><input className='input' type='number' value={form.security_deposit} onChange={e => set('security_deposit', e.target.value)} /></div>
          </div>
          <div style={{ ...g3, marginBottom: '12px' }}>
            <div><label style={lbl}>Due Day</label><input className='input' type='number' min='1' max='28' value={form.due_day} onChange={e => set('due_day', e.target.value)} /></div>
            <div><label style={lbl}>Grace Period (days)</label><input className='input' type='number' value={form.grace_period_days} onChange={e => set('grace_period_days', e.target.value)} /></div>
            <div><label style={lbl}>Late Fee</label><input className='input' type='number' value={form.late_fee_amount} onChange={e => set('late_fee_amount', e.target.value)} /></div>
          </div>
          <div style={g2}>
            <div><label style={lbl}>Late Fee Type</label>
              <select className='input' value={form.late_fee_type} onChange={e => set('late_fee_type', e.target.value)}>
                <option value='flat'>Flat Amount</option>
                <option value='percent'>Percentage</option>
              </select>
            </div>
            <div><label style={lbl}>Pet Deposit</label><input className='input' type='number' value={form.pet_deposit} onChange={e => set('pet_deposit', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Other Terms</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Pet Policy</label>
              <select className='input' value={form.pet_policy} onChange={e => set('pet_policy', e.target.value)}>
                <option value='none'>No Pets</option>
                <option value='allowed'>Pets Allowed</option>
                <option value='case_by_case'>Case by Case</option>
              </select>
            </div>
            <div><label style={lbl}>Parking Spaces</label><input className='input' type='number' value={form.parking_spaces} onChange={e => set('parking_spaces', e.target.value)} /></div>
          </div>
          <div><label style={lbl}>Special Clauses</label><textarea className='input' style={{ resize: 'vertical' }} rows={3} value={form.special_clauses} onChange={e => set('special_clauses', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href={'/leases/' + params.id} className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </AppShell>
  )
}