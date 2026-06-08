'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate } from '@/lib/supabase'
import AmortizationModal from '@/components/AmortizationModal'

export default function MortgagePage() {
  const [mortgages, setMortgages] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [scheduleFor, setScheduleFor] = useState<any>(null)
  const [form, setForm] = useState({
    property_id: '', lender_name: '', loan_number: '',
    original_amount: '', current_balance: '', interest_rate: '',
    term_years: '30', monthly_payment: '', start_date: '',
    due_day: '1', loan_type: 'conventional', is_paid_off: false,
  })

  useEffect(() => {
    Promise.all([
      supabase.from('mortgages').select('*, properties(address, city, state)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, address'),
    ]).then(([m, p]) => {
      setMortgages(m.data || [])
      setProperties(p.data || [])
      setLoading(false)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const blank = { property_id: '', lender_name: '', loan_number: '', original_amount: '', current_balance: '', interest_rate: '', term_years: '30', monthly_payment: '', start_date: '', due_day: '1', loan_type: 'conventional', is_paid_off: false }
  const scrollToForm = () => setTimeout(() => document.getElementById('mortgage-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  function openAdd() { setEditId(null); setForm(blank); setError(''); setShowAdd(true); scrollToForm() }
  function openEdit(m) {
    setEditId(m.id)
    setForm({
      property_id: m.property_id || '', lender_name: m.lender_name || '', loan_number: m.loan_number || '',
      original_amount: String(m.original_amount ?? ''), current_balance: String(m.current_balance ?? ''),
      interest_rate: String(m.interest_rate ?? ''), term_years: String(m.term_years ?? '30'),
      monthly_payment: String(m.monthly_payment ?? ''), start_date: m.start_date || '',
      due_day: String(m.due_day ?? '1'), loan_type: m.loan_type || 'conventional', is_paid_off: !!m.is_paid_off,
    })
    setError(''); setShowAdd(true); scrollToForm()
  }
  async function delMortgage(m) {
    if (!confirm('Delete this mortgage' + (m.properties?.address ? ' for ' + m.properties.address : '') + '? This cannot be undone.')) return
    const { error: err } = await supabase.from('mortgages').delete().eq('id', m.id)
    if (err) { alert('Error: ' + err.message); return }
    setMortgages(prev => prev.filter(x => x.id !== m.id))
  }

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
      due_day: parseInt(form.due_day),
      loan_type: form.loan_type,
      is_paid_off: form.is_paid_off,
    }
    if (editId) {
      const { data, error: err } = await supabase.from('mortgages').update(payload).eq('id', editId).select('*, properties(address, city, state)').single()
      setSaving(false)
      if (err) { setError('Error: ' + err.message); return }
      setMortgages(prev => prev.map(x => x.id === editId ? data : x))
    } else {
      const { data, error: err } = await supabase.from('mortgages').insert(payload).select('*, properties(address, city, state)').single()
      setSaving(false)
      if (err) { setError('Error: ' + err.message); return }
      setMortgages(prev => [data, ...prev])
    }
    setShowAdd(false); setEditId(null)
  }

  const totalBalance = mortgages.filter(m => !m.is_paid_off).reduce((s, m) => s + (m.current_balance || 0), 0)
  const totalPayment = mortgages.filter(m => !m.is_paid_off).reduce((s, m) => s + (m.monthly_payment || 0), 0)
  const totalOriginal = mortgages.reduce((s, m) => s + (m.original_amount || 0), 0)
  const totalPaidDown = totalOriginal - totalBalance

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Mortgages</div>
        <button className='btn btn-primary' onClick={() => { if (showAdd) { setShowAdd(false); setEditId(null) } else { openAdd() } }}>{showAdd ? 'Cancel' : '+ Add Mortgage'}</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Balance', value: fm(totalBalance), color: 'var(--red)' },
            { label: 'Monthly Payments', value: fm(totalPayment), color: 'var(--amber)' },
            { label: 'Original Loans', value: fm(totalOriginal), color: 'var(--text)' },
            { label: 'Paid Down', value: fm(totalPaidDown), color: 'var(--green)' },
            { label: 'Active Mortgages', value: mortgages.filter(m => !m.is_paid_off).length, color: 'var(--blue)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {showAdd && (
          <div id='mortgage-form' style={{ ...card, border: '0.5px solid rgba(74,222,154,0.3)' }}>
            <div style={secTtl}>{editId ? 'Edit Mortgage' : 'Add Mortgage'}</div>
            {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
            <div style={{ ...g2, marginBottom: '12px' }}>
              <div><label style={lbl}>Property *</label>
                <select className='input' value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                  <option value=''>Select property...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Loan Type</label>
                <select className='input' value={form.loan_type} onChange={e => set('loan_type', e.target.value)}>
                  <option value='conventional'>Conventional</option>
                  <option value='fha'>FHA</option>
                  <option value='va'>VA</option>
                  <option value='usda'>USDA</option>
                  <option value='jumbo'>Jumbo</option>
                </select>
              </div>
            </div>
            <div style={{ ...g2, marginBottom: '12px' }}>
              <div><label style={lbl}>Lender Name</label><input className='input' placeholder='e.g. Wells Fargo' value={form.lender_name} onChange={e => set('lender_name', e.target.value)} /></div>
              <div><label style={lbl}>Loan Number</label><input className='input' placeholder='Optional' value={form.loan_number} onChange={e => set('loan_number', e.target.value)} /></div>
            </div>
            <div style={{ ...g3, marginBottom: '12px' }}>
              <div><label style={lbl}>Original Amount *</label><input className='input' type='number' placeholder='285000' value={form.original_amount} onChange={e => set('original_amount', e.target.value)} /></div>
              <div><label style={lbl}>Current Balance *</label><input className='input' type='number' placeholder='250000' value={form.current_balance} onChange={e => set('current_balance', e.target.value)} /></div>
              <div><label style={lbl}>Monthly Payment *</label><input className='input' type='number' placeholder='1500' value={form.monthly_payment} onChange={e => set('monthly_payment', e.target.value)} /></div>
            </div>
            <div style={{ ...g3, marginBottom: '12px' }}>
              <div><label style={lbl}>Interest Rate % *</label><input className='input' type='number' step='0.01' placeholder='6.5' value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} /></div>
              <div><label style={lbl}>Term (Years)</label><input className='input' type='number' placeholder='30' value={form.term_years} onChange={e => set('term_years', e.target.value)} /></div>
              <div><label style={lbl}>Start Date *</label><input className='input' type='date' value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
            </div>
            <div style={{ ...g2, marginBottom: '12px' }}>
              <div><label style={lbl}>Payment Due Day</label><input className='input' type='number' min='1' max='28' value={form.due_day} onChange={e => set('due_day', e.target.value)} /></div>
              <div><label style={lbl}>Status</label>
                <select className='input' value={form.is_paid_off ? 'paid' : 'active'} onChange={e => set('is_paid_off', e.target.value === 'paid')}>
                  <option value='active'>Active</option>
                  <option value='paid'>Paid Off</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className='btn btn-ghost' onClick={() => { setShowAdd(false); setEditId(null) }}>Cancel</button>
              <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : (editId ? 'Save Changes' : 'Save Mortgage')}</button>
            </div>
          </div>
        )}

        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && mortgages.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏦</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>No mortgages yet</div>
            <button className='btn btn-primary' onClick={() => setShowAdd(true)}>+ Add Mortgage</button>
          </div>
        )}
        {!loading && mortgages.map(m => (
          <div key={m.id} style={{ ...card, borderLeft: m.is_paid_off ? '3px solid #4ADE9A' : '3px solid #60A5FA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{m.properties?.address}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{m.lender_name || 'No lender'} {m.loan_number ? '· #' + m.loan_number : ''}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px', textTransform: 'capitalize' }}>{m.loan_type} · {m.term_years}yr · {m.interest_rate}%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: m.is_paid_off ? 'var(--green)' : 'var(--red)' }}>{fm(m.current_balance)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>current balance</div>
                {m.is_paid_off && <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>✓ PAID OFF</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                ['Original', fm(m.original_amount)],
                ['Monthly', fm(m.monthly_payment)],
                ['Paid Down', fm(m.original_amount - m.current_balance)],
                ['Started', formatDate(m.start_date)],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => setScheduleFor(m)} className='btn btn-ghost' style={{ fontSize: '12px' }}>📅 Amortization Schedule</button>
              <button onClick={() => openEdit(m)} className='btn btn-ghost' style={{ fontSize: '12px' }}>Edit</button>
              <button onClick={() => delMortgage(m)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {scheduleFor && <AmortizationModal mortgage={scheduleFor} onClose={() => setScheduleFor(null)} />}
    </AppShell>
  )
}