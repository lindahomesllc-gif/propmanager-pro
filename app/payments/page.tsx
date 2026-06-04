'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [leases, setLeases] = useState([])
  const [form, setForm] = useState({
    tenant_id: '', lease_id: '', property_id: '',
    amount_due: '', amount_paid: '', due_date: '',
    paid_date: new Date().toISOString().split('T')[0],
    payment_method: 'check', status: 'paid', notes: ''
  })

  useEffect(() => {
    Promise.all([
      supabase.from('payments').select('*, tenants(full_name), properties(address)').order('due_date', { ascending: false }),
      supabase.from('tenants').select('id, full_name, property_id, properties(address)').eq('status', 'active'),
    ]).then(([p, t]) => {
      setPayments(p.data || [])
      const tdata = t.data || []
      setTenants(tdata)
      const tid = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant_id') : null
      if (tid) { setForm(f => ({ ...f, tenant_id: tid })); setShowForm(true) }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!form.tenant_id) return
    supabase.from('leases').select('id, rent_amount, start_date, end_date, due_day')
      .eq('tenant_id', form.tenant_id).eq('status', 'executed')
      .then(({ data }) => {
        setLeases(data || [])
        if (data && data.length > 0) {
          const l = data[0]
          const t = tenants.find(x => x.id === form.tenant_id)
          setForm(f => ({ ...f, lease_id: l.id, property_id: t?.property_id || '', amount_due: l.rent_amount.toString(), amount_paid: l.rent_amount.toString() }))
        }
      })
  }, [form.tenant_id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function openAdd(prefillTenantId = '') {
    setEditId(null)
    setForm({ tenant_id: prefillTenantId || '', lease_id: '', property_id: '', amount_due: '', amount_paid: '', due_date: '', paid_date: new Date().toISOString().split('T')[0], payment_method: 'check', status: 'paid', notes: '' })
    setShowForm(true)
  }


  function openEdit(p) {
    setEditId(p.id)
    setForm({
      tenant_id: p.tenant_id || '',
      lease_id: p.lease_id || '',
      property_id: p.property_id || '',
      amount_due: p.amount_due?.toString() || '',
      amount_paid: p.amount_paid?.toString() || '',
      due_date: p.due_date || '',
      paid_date: p.paid_date || new Date().toISOString().split('T')[0],
      payment_method: p.payment_method || 'check',
      status: p.status || 'paid',
      notes: p.notes || ''
    })
    setShowForm(true)
  }

  async function save() {
    setError('')
    if (!form.tenant_id) { setError('Please select a tenant'); return }
    if (!form.amount_due) { setError('Amount due is required'); return }
    if (!form.due_date) { setError('Due date is required'); return }
    setSaving(true)
    const payload = {
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
    }
    if (editId) {
      const { data, error: err } = await supabase.from('payments').update(payload).eq('id', editId).select('*, tenants(full_name), properties(address)').single()
      if (err) { setError('Error: ' + err.message); setSaving(false); return }
      setPayments(prev => prev.map(p => p.id === editId ? data : p))
    } else {
      const { data, error: err } = await supabase.from('payments').insert(payload).select('*, tenants(full_name), properties(address)').single()
      if (err) { setError('Error: ' + err.message); setSaving(false); return }
      setPayments(prev => [data, ...prev])
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
  }

  async function deletePayment(id) {
    if (!confirm('Delete this payment?')) return
    await supabase.from('payments').delete().eq('id', id)
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  const statusColor = (s) => ({ paid: 'var(--green)', late: 'var(--red)', partial: 'var(--amber)', due: 'var(--amber)', upcoming: 'var(--blue)', waived: 'var(--text3)' }[s] || 'var(--text3)')
  const chipClass = (s) => ({ paid: 'chip-g', late: 'chip-r', partial: 'chip-a', due: 'chip-a', upcoming: 'chip-b', waived: 'chip-x' }[s] || 'chip-x')

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter)

  const summary = {
    paid: payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0),
    due: payments.filter(p => p.status === 'due' || p.status === 'upcoming').reduce((s, p) => s + p.amount_due, 0),
    late: payments.filter(p => p.status === 'late').reduce((s, p) => s + p.amount_due, 0),
    partial: payments.filter(p => p.status === 'partial').reduce((s, p) => s + p.amount_paid, 0),
    paidCount: payments.filter(p => p.status === 'paid').length,
    dueCount: payments.filter(p => p.status === 'due' || p.status === 'upcoming').length,
    lateCount: payments.filter(p => p.status === 'late').length,
    partialCount: payments.filter(p => p.status === 'partial').length,
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Payments</div>
        <button onClick={openAdd} className='btn btn-primary'>+ Record Payment</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: 'Collected', value: fm(summary.paid), count: summary.paidCount, color: 'var(--green)', bg: 'var(--green-bg)', filterVal: 'paid', icon: '✅' },
          { label: 'Due', value: fm(summary.due), count: summary.dueCount, color: 'var(--amber)', bg: 'var(--amber-bg)', filterVal: 'due', icon: '📅' },
          { label: 'Late', value: fm(summary.late), count: summary.lateCount, color: 'var(--red)', bg: 'var(--red-bg)', filterVal: 'late', icon: '⚠️' },
          { label: 'Partial', value: fm(summary.partial), count: summary.partialCount, color: 'var(--blue)', bg: 'var(--bg3)', filterVal: 'partial', icon: '🔄' },
        ].map((s, i) => (
          <button key={s.label} onClick={() => setFilter(filter === s.filterVal ? 'all' : s.filterVal)} style={{ padding: '14px 20px', background: filter === s.filterVal ? s.bg : 'var(--bg2)', border: 'none', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{s.icon} {s.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{s.count} payment{s.count !== 1 ? 's' : ''}</div>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexWrap: 'wrap' }}>
        {['all', 'paid', 'due', 'late', 'partial', 'upcoming', 'waived'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px', border: '0.5px solid var(--border2)', background: filter === f ? 'var(--green)' : 'transparent', color: filter === f ? '#fff' : 'var(--text2)', cursor: 'pointer', fontWeight: filter === f ? 700 : 400, textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💳</div>
            <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '16px' }}>No payments found</div>
            <button onClick={openAdd} className='btn btn-primary'>+ Record Payment</button>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filtered.map(p => (
              <div key={p.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + statusColor(p.status), borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{p.tenants?.full_name || '—'}</div>
                    <span className={'chip ' + chipClass(p.status)} style={{ textTransform: 'capitalize' }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{p.properties?.address || '—'} · Due {formatDate(p.due_date)}{p.paid_date ? ' · Paid ' + formatDate(p.paid_date) : ''}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{p.payment_method ? p.payment_method.replace('_', ' ') : ''}{p.notes ? ' · ' + p.notes : ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: statusColor(p.status), fontFamily: 'Syne, sans-serif' }}>{fm(p.amount_paid)}</div>
                  {p.amount_paid !== p.amount_due && <div style={{ fontSize: '11px', color: 'var(--text3)' }}>of {fm(p.amount_due)}</div>}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => openEdit(p)} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deletePayment(p.id)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{editId ? 'Edit Payment' : 'Record Payment'}</div>
            {error && <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: 'var(--red)', fontSize: '13px' }}>{error}</div>}
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Tenant *</label>
              <select style={inp} value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
                <option value=''>Select tenant...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name} — {t.properties?.address}</option>)}
              </select>
            </div>
            <div style={g2}>
              <div><label style={lbl}>Amount Due *</label><input style={inp} type='number' value={form.amount_due} onChange={e => set('amount_due', e.target.value)} /></div>
              <div><label style={lbl}>Amount Paid</label><input style={inp} type='number' value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} /></div>
            </div>
            <div style={g2}>
              <div><label style={lbl}>Due Date *</label><input style={inp} type='date' value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
              <div><label style={lbl}>Date Paid</label><input style={inp} type='date' value={form.paid_date} onChange={e => set('paid_date', e.target.value)} /></div>
            </div>
            <div style={g2}>
              <div>
                <label style={lbl}>Payment Method</label>
                <select style={inp} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                  <option value='check'>Check</option>
                  <option value='cash'>Cash</option>
                  <option value='zelle'>Zelle</option>
                  <option value='ach'>ACH / Bank Transfer</option>
                  <option value='card'>Credit/Debit Card</option>
                  <option value='money_order'>Money Order</option>
                  <option value='autopay'>Autopay</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value='paid'>Paid</option>
                  <option value='partial'>Partial</option>
                  <option value='late'>Late</option>
                  <option value='due'>Due</option>
                  <option value='upcoming'>Upcoming</option>
                  <option value='waived'>Waived</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className='btn btn-ghost'>Cancel</button>
              <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Saving...' : editId ? 'Save Changes' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}