'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm } from '@/lib/supabase'

export default function RecordPaymentPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    tenant_id: '', lease_id: '', property_id: '',
    amount_due: '', amount_paid: '', due_date: '',
    paid_date: new Date().toISOString().split('T')[0],
    payment_method: 'check', status: 'paid', notes: ''
  })

  useEffect(() => {
    supabase.from('tenants').select('id, full_name, property_id, properties(address)')
      .eq('user_id', USER_ID).eq('status', 'active')
      .then(({ data }) => setTenants(data || []))
  }, [])

  useEffect(() => {
    if (!form.tenant_id) return
    supabase.from('leases').select('id, rent_amount, start_date, end_date, due_day')
      .eq('user_id', USER_ID).eq('tenant_id', form.tenant_id).eq('status', 'executed')
      .then(({ data }) => {
        setLeases(data || [])
        if (data && data.length > 0) {
          const l = data[0]
          const t = tenants.find(t => t.id === form.tenant_id)
          setForm(f => ({
            ...f,
            lease_id: l.id,
            property_id:
mkdir -p ~/Desktop/propmanager-pro/app/payments/new && cat > ~/Desktop/propmanager-pro/app/payments/new/page.tsx << 'ENDOFFILE'
'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm } from '@/lib/supabase'

export default function RecordPaymentPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    tenant_id: '', lease_id: '', property_id: '',
    amount_due: '', amount_paid: '', due_date: '',
    paid_date: new Date().toISOString().split('T')[0],
    payment_method: 'check', status: 'paid', notes: ''
  })

  useEffect(() => {
    supabase.from('tenants').select('id, full_name, property_id, properties(address)')
      .eq('user_id', USER_ID).eq('status', 'active')
      .then(({ data }) => setTenants(data || []))
  }, [])

  useEffect(() => {
    if (!form.tenant_id) return
    supabase.from('leases').select('id, rent_amount, start_date, end_date, due_day')
      .eq('user_id', USER_ID).eq('tenant_id', form.tenant_id).eq('status', 'executed')
      .then(({ data }) => {
        setLeases(data || [])
        if (data && data.length > 0) {
          const l = data[0]
          const t = tenants.find(t => t.id === form.tenant_id)
          setForm(f => ({
            ...f,
            lease_id: l.id,
            property_id: t?.property_id || '',
            amount_due: l.rent_amount.toString(),
            amount_paid: l.rent_amount.toString(),
          }))
        }
      })
  }, [form.tenant_id])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.tenant_id) { setError('Please select a tenant'); return }
    if (!form.amount_due) { setError('Amount due is required'); return }
    if (!form.due_date) { setError('Due date is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('payments').insert({
      user_id: USER_ID,
      tenant_id: form.tenant_id,
      lease_id: form.lease_id || null,
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

  const inp: any = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5A5A56', marginBottom: '4px' }
  const card: any = { background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const btnP: any = { background: '#4ADE9A', color: '#0E0E0C', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
  const btnG: any = { background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const secTtl: any = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5A56', marginBottom: '12px' }

  const selectedTenant = tenants.find(t => t.id === form.tenant_id)

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Record Payment</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/payments" style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Payment'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}

        <div style={card}>
          <div style={secTtl}>Tenant</div>
          <label style={lbl}>Select Tenant *</label>
          <select style={inp} value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
            <option value="">Select a tenant...</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name} — {t.properties?.address}</option>)}
          </select>
          {selectedTenant && leases.length === 0 && (
            <div style={{ fontSize: '11px', color: '#FBB040', marginTop: '6px' }}>⚠️ No active lease found for this tenant. You can still record a payment manually.</div>
          )}
        </div>

        <div style={card}>
          <div style={secTtl}>Payment Details</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div>
              <label style={lbl}>Amount Due *</label>
              <input style={inp} type="number" placeholder="0.00" value={form.amount_due} onChange={e => set('amount_due', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Amount Paid</label>
              <input style={inp} type="number" placeholder="0.00" value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} />
            </div>
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div>
              <label style={lbl}>Due Date *</label>
              <input style={inp} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Date Paid</label>
              <input style={inp} type="date" value={form.paid_date} onChange={e => set('paid_date', e.target.value)} />
            </div>
          </div>
          <div style={g2}>
            <div>
              <label style={lbl}>Payment Method</label>
              <select style={inp} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="zelle">Zelle</option>
                <option value="ach">ACH / Bank Transfer</option>
                <option value="card">Credit/Debit Card</option>
                <option value="money_order">Money Order</option>
                <option value="autopay">Autopay</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="late">Late</option>
                <option value="due">Due</option>
                <option value="upcoming">Upcoming</option>
                <option value="waived">Waived</option>
              </select>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={secTtl}>Notes</div>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder="Any notes about this payment..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href="/payments" style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Payment'}</button>
        </div>
      </div>
    </AppShell>
  )
}
