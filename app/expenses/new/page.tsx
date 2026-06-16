'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function NewExpensePage() {
  const [properties, setProperties] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    property_id: '', amount: '', expense_date: new Date().toISOString().split('T')[0],
    category: 'repairs_maintenance', description: '',
    vendor_name: '', is_deductible: true,
  })

  useEffect(() => {
    supabase.from('properties').select('id, address')
      .then(({ data }) => setProperties(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.property_id) { setError('Please select a property'); return }
    if (!form.amount) { setError('Amount is required'); return }
    if (!form.expense_date) { setError('Date is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('expenses').insert({
      property_id: form.property_id,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      category: form.category,
      description: form.description || null,
      vendor_name: form.vendor_name || null,
      is_deductible: form.is_deductible,
    })
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/expenses'
  }

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href='/expenses' style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Expenses</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>Add Expense</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href='/expenses' className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Expense'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Property & Date</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Property *</label>
              <select className='input' value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                <option value=''>Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Date *</label><input className='input' type='date' value={form.expense_date} onChange={e => set('expense_date', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Expense Details</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Amount *</label><input className='input' type='number' placeholder='0.00' value={form.amount} onChange={e => set('amount', e.target.value)} /></div>
            <div><label style={lbl}>Category</label>
              <select className='input' value={form.category} onChange={e => set('category', e.target.value)}>
                <option value='repairs_maintenance'>Repairs & Maintenance</option>
                <option value='mortgage'>Mortgage</option>
                <option value='property_tax'>Property Tax</option>
                <option value='insurance'>Insurance</option>
                <option value='utilities'>Utilities</option>
                <option value='hoa'>HOA Dues</option>
                <option value='management_fees'>Management Fees</option>
                <option value='advertising'>Advertising</option>
                <option value='legal_professional'>Legal & Professional</option>
                <option value='depreciation'>Depreciation</option>
                <option value='supplies'>Supplies</option>
                <option value='travel'>Travel</option>
                <option value='other'>Other</option>
              </select>
            </div>
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Vendor / Payee</label><input className='input' placeholder='e.g. Home Depot' value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)} /></div>
            <div><label style={lbl}>Tax Deductible</label>
              <select className='input' value={form.is_deductible ? 'true' : 'false'} onChange={e => set('is_deductible', e.target.value === 'true')}>
                <option value='true'>Yes</option>
                <option value='false'>No</option>
              </select>
            </div>
          </div>
          <div><label style={lbl}>Description</label><textarea className='input' style={{ resize: 'vertical' }} rows={3} placeholder='Details about this expense...' value={form.description} onChange={e => set('description', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href='/expenses' className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Expense'}</button>
        </div>
      </div>
    </AppShell>
  )
}