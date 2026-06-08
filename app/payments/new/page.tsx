'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function RecordPaymentPage() {
  const [tenants, setTenants] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    tenant_id: '', property_id: '',
    amount_due: '', amount_paid: '',
    due_date: '', paid_date: new Date().toISOString().split('T')[0],
    payment_method: 'check', status: 'paid', notes: ''
  })

  useEffect(() => {
    supabase.from('tenants').select('id, full_name, property_id, properties(address)')
      .eq('status', 'active')
      .then(({ data }) => setTenants(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.tenant_id) { setError('Please select a tenant'); return }
    if (!form.amount_due) { setError('Amount due is required'); return }
    if (!form.due_date) { setError('Due date is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('payments').insert({
      tenant_id: form.tenant_id,
      property_id: form.property_id || null,
      amount_due: parseFloat(form.amount_due),
      amount_paid: parseFloat(form.amount_paid) || 0,
      due_date: form.due_date,
      paid_date: form.status === 'paid' ? form.paid_date : null,
      payment_method: form.status === 'paid' ? form.payment_method : null,
      status: form.status,
      notes: form.notes || null,
    })
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/payments'
  }

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Record Payment</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href='/payments' className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Payment'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Tenant</div>
          <label style={lbl}>Select Tenant</label>
          <select className='input' value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
            <option value=''>Select a tenant...</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name} - {t.properties && t.properties.address}</option>)}
          </select>
        </div>
        <div style={card}>
          <div style={secTtl}>Payment Details</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Amount Due</label><input className='input' type='number' placeholder='0.00' value={form.amount_due} onChange={e => set('amount_due', e.target.value)} /></div>
            <div><label style={lbl}>Amount Paid</label><input className='input' type='number' placeholder='0.00' value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} /></div>
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Due Date</label><input className='input' type='date' value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
            <div><label style={lbl}>Date Paid</label><input className='input' type='date' value={form.paid_date} onChange={e => set('paid_date', e.target.value)} /></div>
          </div>
          <div style={g2}>
            <div><label style={lbl}>Payment Method</label>
              <select className='input' value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                <option value='check'>Check</option>
                <option value='cash'>Cash</option>
                <option value='zelle'>Zelle</option>
                <option value='ach'>ACH / Bank Transfer</option>
                <option value='card'>Credit/Debit Card</option>
                <option value='money_order'>Money Order</option>
                <option value='autopay'>Autopay</option>
              </select>
            </div>
            <div><label style={lbl}>Status</label>
              <select className='input' value={form.status} onChange={e => set('status', e.target.value)}>
                <option value='paid'>Paid</option>
                <option value='partial'>Partial</option>
                <option value='late'>Late</option>
                <option value='due'>Due</option>
                <option value='upcoming'>Upcoming</option>
                <option value='waived'>Waived</option>
              </select>
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Notes</div>
          <textarea className='input' style={{ resize: 'vertical' }} rows={3} placeholder='Any notes...' value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href='/payments' className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Payment'}</button>
        </div>
      </div>
    </AppShell>
  )
}