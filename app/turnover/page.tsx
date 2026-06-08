'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate } from '@/lib/supabase'

export default function TurnoverPage() {
  const [turnovers, setTurnovers] = useState([])
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    property_id: '', tenant_id: '', move_out_date: '',
    expected_move_in: '', cleaning_status: 'pending',
    repairs_status: 'pending', inspection_status: 'pending',
    cleaning_cost: '', repairs_cost: '', notes: '',
    deposit_returned: false, deposit_deductions: '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('condition_reports').select('*, properties(address), tenants(full_name)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, address'),
      supabase.from('tenants').select('id, full_name, property_id'),
    ]).then(([t, p, ten]) => {
      setTurnovers(t.data || [])
      setProperties(p.data || [])
      setTenants(ten.data || [])
      setLoading(false)
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
    setSaving(true)
    const { error: err } = await supabase.from('condition_reports').insert({
      property_id: form.property_id,
      tenant_id: form.tenant_id || null,
      report_type: 'move_out',
      inspection_date: form.move_out_date || new Date().toISOString().split('T')[0],
      landlord_notes: form.notes || null,
      overall_condition: 'fair',
      room_data: JSON.stringify({
        move_out_date: form.move_out_date,
        expected_move_in: form.expected_move_in,
        cleaning_status: form.cleaning_status,
        repairs_status: form.repairs_status,
        inspection_status: form.inspection_status,
        cleaning_cost: form.cleaning_cost,
        repairs_cost: form.repairs_cost,
        deposit_returned: form.deposit_returned,
        deposit_deductions: form.deposit_deductions,
      }),
    })
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.reload()
  }

  const statusBadge = (s) => {
    const colors = { pending: 'var(--amber)', in_progress: 'var(--blue)', complete: 'var(--green)' }
    const color = colors[s] || 'var(--text3)'
    return <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: color + '22', color, fontWeight: 600, textTransform: 'capitalize' }}>{s?.replace('_', ' ')}</span>
  }

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  const active = turnovers.filter(t => { try { const d = JSON.parse(t.room_data); return d.cleaning_status !== 'complete' || d.repairs_status !== 'complete' } catch { return true } })
  const completed = turnovers.filter(t => { try { const d = JSON.parse(t.room_data); return d.cleaning_status === 'complete' && d.repairs_status === 'complete' } catch { return false } })

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Turnover</div>
        <button className='btn btn-primary' onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : '+ New Turnover'}</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Active Turnovers', value: active.length, color: 'var(--amber)' },
            { label: 'Completed', value: completed.length, color: 'var(--green)' },
            { label: 'Total', value: turnovers.length, color: 'var(--text)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {showAdd && (
          <div style={{ ...card, border: '0.5px solid var(--green)' }}>
            <div style={secTtl}>New Turnover</div>
            {error && <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: 'var(--red)', fontSize: '13px' }}>{error}</div>}
            <div style={{ ...g2, marginBottom: '12px' }}>
              <div><label style={lbl}>Property *</label>
                <select className='input' value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                  <option value=''>Select property...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Tenant Moving Out</label>
                <select className='input' value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
                  <option value=''>Select tenant...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ ...g2, marginBottom: '12px' }}>
              <div><label style={lbl}>Move Out Date</label><input className='input' type='date' value={form.move_out_date} onChange={e => set('move_out_date', e.target.value)} /></div>
              <div><label style={lbl}>Expected Move In</label><input className='input' type='date' value={form.expected_move_in} onChange={e => set('expected_move_in', e.target.value)} /></div>
            </div>
            <div style={{ ...g3, marginBottom: '12px' }}>
              <div><label style={lbl}>Cleaning Status</label>
                <select className='input' value={form.cleaning_status} onChange={e => set('cleaning_status', e.target.value)}>
                  <option value='pending'>Pending</option>
                  <option value='in_progress'>In Progress</option>
                  <option value='complete'>Complete</option>
                </select>
              </div>
              <div><label style={lbl}>Repairs Status</label>
                <select className='input' value={form.repairs_status} onChange={e => set('repairs_status', e.target.value)}>
                  <option value='pending'>Pending</option>
                  <option value='in_progress'>In Progress</option>
                  <option value='complete'>Complete</option>
                </select>
              </div>
              <div><label style={lbl}>Inspection Status</label>
                <select className='input' value={form.inspection_status} onChange={e => set('inspection_status', e.target.value)}>
                  <option value='pending'>Pending</option>
                  <option value='in_progress'>In Progress</option>
                  <option value='complete'>Complete</option>
                </select>
              </div>
            </div>
            <div style={{ ...g2, marginBottom: '12px' }}>
              <div><label style={lbl}>Cleaning Cost</label><input className='input' type='number' placeholder='0.00' value={form.cleaning_cost} onChange={e => set('cleaning_cost', e.target.value)} /></div>
              <div><label style={lbl}>Repairs Cost</label><input className='input' type='number' placeholder='0.00' value={form.repairs_cost} onChange={e => set('repairs_cost', e.target.value)} /></div>
            </div>
            <div style={{ ...g2, marginBottom: '12px' }}>
              <div><label style={lbl}>Deposit Returned</label>
                <select className='input' value={form.deposit_returned ? 'true' : 'false'} onChange={e => set('deposit_returned', e.target.value === 'true')}>
                  <option value='false'>No</option>
                  <option value='true'>Yes</option>
                </select>
              </div>
              <div><label style={lbl}>Deposit Deductions</label><input className='input' type='number' placeholder='0.00' value={form.deposit_deductions} onChange={e => set('deposit_deductions', e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: '12px' }}><label style={lbl}>Notes</label><textarea className='input' style={{ resize: 'vertical' }} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className='btn btn-ghost' onClick={() => setShowAdd(false)}>Cancel</button>
              <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Turnover'}</button>
            </div>
          </div>
        )}

        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && turnovers.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔄</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>No turnovers yet</div>
            <div style={{ fontSize: '13px', marginBottom: '20px' }}>Track unit turnover when tenants move out.</div>
            <button className='btn btn-primary' onClick={() => setShowAdd(true)}>+ New Turnover</button>
          </div>
        )}

        {!loading && active.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Active Turnovers</div>
            {active.map(t => {
              let data = {}
              try { data = JSON.parse(t.room_data) } catch {}
              return (
                <div key={t.id} style={{ ...card, borderLeft: '3px solid var(--amber)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t.properties?.address}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{t.tenants?.full_name ? 'Moving out: ' + t.tenants.full_name : 'No tenant'}</div>
                      {data.move_out_date && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>Move out: {formatDate(data.move_out_date)}</div>}
                      {data.expected_move_in && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>Next move in: {formatDate(data.expected_move_in)}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
                    {[
                      ['Cleaning', data.cleaning_status || 'pending'],
                      ['Repairs', data.repairs_status || 'pending'],
                      ['Inspection', data.inspection_status || 'pending'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase' }}>{k}</div>
                        <div style={{ marginTop: '4px' }}>{statusBadge(v)}</div>
                      </div>
                    ))}
                  </div>
                  {(data.cleaning_cost || data.repairs_cost) && (
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text3)' }}>
                      {data.cleaning_cost && <span>Cleaning: <strong style={{ color: 'var(--text)' }}>{fm(parseFloat(data.cleaning_cost))}</strong></span>}
                      {data.repairs_cost && <span>Repairs: <strong style={{ color: 'var(--text)' }}>{fm(parseFloat(data.repairs_cost))}</strong></span>}
                    </div>
                  )}
                  {t.landlord_notes && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '8px' }}>{t.landlord_notes}</div>}
                </div>
              )
            })}
          </div>
        )}

        {!loading && completed.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Completed Turnovers</div>
            {completed.map(t => {
              let data = {}
              try { data = JSON.parse(t.room_data) } catch {}
              return (
                <div key={t.id} style={{ ...card, borderLeft: '3px solid var(--green)', opacity: 0.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{t.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{t.tenants?.full_name} · {formatDate(t.inspection_date)}</div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 600 }}>✓ Complete</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}