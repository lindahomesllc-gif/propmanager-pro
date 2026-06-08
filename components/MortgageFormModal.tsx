'use client'
import { useState } from 'react'
import { supabase, LOAN_TYPES } from '@/lib/supabase'

// Shared add/edit mortgage form, shown as a centered modal so it works the same
// from the Mortgages page and from a property's Financials tab (no page bouncing).
export default function MortgageFormModal({
  mortgage = null,            // existing mortgage to edit, or null to add
  properties = [],            // [{ id, address }] for the property picker
  lockProperty = false,       // when opened from a property page, don't let it change
  onClose,
  onSaved,                    // (savedRow, isEdit) => void
}: {
  mortgage?: any
  properties?: any[]
  lockProperty?: boolean
  onClose: () => void
  onSaved: (row: any, isEdit: boolean) => void
}) {
  const editId = mortgage?.id || null
  const [form, setForm] = useState<any>(mortgage ? {
    property_id: mortgage.property_id || '', lender_name: mortgage.lender_name || '', loan_number: mortgage.loan_number || '',
    original_amount: String(mortgage.original_amount ?? ''), current_balance: String(mortgage.current_balance ?? ''),
    interest_rate: String(mortgage.interest_rate ?? ''), term_years: String(mortgage.term_years ?? '30'),
    monthly_payment: String(mortgage.monthly_payment ?? ''), start_date: mortgage.start_date || '',
    due_day: String(mortgage.due_day ?? '1'), loan_type: mortgage.loan_type || 'conventional', is_paid_off: !!mortgage.is_paid_off,
  } : {
    property_id: properties[0]?.id || '', lender_name: '', loan_number: '', original_amount: '', current_balance: '',
    interest_rate: '', term_years: '30', monthly_payment: '', start_date: '', due_day: '1', loan_type: 'conventional', is_paid_off: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.property_id) { setError('Please select a property'); return }
    if (!form.original_amount) { setError('Original amount is required'); return }
    if (!form.current_balance) { setError('Current balance is required'); return }
    if (!form.interest_rate) { setError('Interest rate is required'); return }
    if (!form.monthly_payment) { setError('Monthly payment is required'); return }
    if (!form.start_date) { setError('Start date is required'); return }
    setSaving(true)
    const payload = {
      property_id: form.property_id,
      lender_name: form.lender_name || null,
      loan_number: form.loan_number || null,
      original_amount: parseFloat(form.original_amount),
      current_balance: parseFloat(form.current_balance),
      interest_rate: parseFloat(form.interest_rate),
      term_years: parseInt(form.term_years),
      monthly_payment: parseFloat(form.monthly_payment),
      start_date: form.start_date,
      due_day: parseInt(form.due_day) || 1,
      loan_type: form.loan_type,
      is_paid_off: form.is_paid_off,
    }
    const { data, error: err } = editId
      ? await supabase.from('mortgages').update(payload).eq('id', editId).select('*, properties(address, city, state)').single()
      : await supabase.from('mortgages').insert(payload).select('*, properties(address, city, state)').single()
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    onSaved(data, !!editId)
  }

  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const g2: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }
  const g3: any = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={onClose}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '24px', width: '560px', maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{editId ? 'Edit Mortgage' : 'Add Mortgage'}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {error && <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: 'var(--red)', fontSize: '13px' }}>{error}</div>}

        <div style={g2}>
          <div><label style={lbl}>Property *</label>
            <select className='input' value={form.property_id} disabled={lockProperty} onChange={e => set('property_id', e.target.value)}>
              <option value=''>Select property...</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Loan Type</label>
            <select className='input' value={form.loan_type} onChange={e => set('loan_type', e.target.value)}>
              {LOAN_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div style={g2}>
          <div><label style={lbl}>Lender Name</label><input className='input' placeholder='e.g. Wells Fargo' value={form.lender_name} onChange={e => set('lender_name', e.target.value)} /></div>
          <div><label style={lbl}>Loan Number</label><input className='input' placeholder='Optional' value={form.loan_number} onChange={e => set('loan_number', e.target.value)} /></div>
        </div>
        <div style={g3}>
          <div><label style={lbl}>Original Amount *</label><input className='input' type='number' placeholder='299000' value={form.original_amount} onChange={e => set('original_amount', e.target.value)} /></div>
          <div><label style={lbl}>Current Balance *</label><input className='input' type='number' placeholder='299000' value={form.current_balance} onChange={e => set('current_balance', e.target.value)} /></div>
          <div><label style={lbl}>Monthly Payment *</label><input className='input' type='number' placeholder='PITI you pay' value={form.monthly_payment} onChange={e => set('monthly_payment', e.target.value)} /></div>
        </div>
        <div style={g3}>
          <div><label style={lbl}>Interest Rate % *</label><input className='input' type='number' step='0.001' placeholder='6.191' value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} /></div>
          <div><label style={lbl}>Term (Years)</label><input className='input' type='number' placeholder='30' value={form.term_years} onChange={e => set('term_years', e.target.value)} /></div>
          <div><label style={lbl}>Start Date *</label><input className='input' type='date' value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
        </div>
        <div style={g2}>
          <div><label style={lbl}>Payment Due Day</label><input className='input' type='number' min='1' max='28' value={form.due_day} onChange={e => set('due_day', e.target.value)} /></div>
          <div><label style={lbl}>Status</label>
            <select className='input' value={form.is_paid_off ? 'paid' : 'active'} onChange={e => set('is_paid_off', e.target.value === 'paid')}>
              <option value='active'>Active</option>
              <option value='paid'>Paid Off</option>
            </select>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '14px' }}>Tip: enter the payment you actually pay (PITI is fine). The amortization figures P&amp;I from the loan amount, rate &amp; term.</div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className='btn btn-ghost'>Cancel</button>
          <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Saving…' : (editId ? 'Save Changes' : 'Save Mortgage')}</button>
        </div>
      </div>
    </div>
  )
}
