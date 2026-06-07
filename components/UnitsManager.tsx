'use client'
import { useState, useEffect } from 'react'
import { supabase, fm } from '@/lib/supabase'

const KINDS = [
  { v: 'unit', label: 'Unit' },
  { v: 'room', label: 'Room' },
]
const blankForm = { label: '', kind: 'unit', bedrooms: '', bathrooms: '', sqft: '', market_rent: '', status: 'vacant', notes: '' }

export default function UnitsManager({ propertyId, tenants = [] }: { propertyId: string, tenants?: any[] }) {
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<any>(blankForm)

  async function load() {
    const { data } = await supabase.from('units').select('*').eq('property_id', propertyId).order('label')
    setUnits(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [propertyId])

  // which tenant occupies a given unit (prefer the FK, fall back to legacy label match)
  const tenantFor = (u: any) =>
    tenants.find(t => t.unit_id === u.id) ||
    tenants.find(t => !t.unit_id && t.unit_address && t.unit_address === u.label) || null

  function openAdd() { setEditId(null); setForm(blankForm); setError(''); setShowForm(true) }
  function openEdit(u: any) {
    setEditId(u.id)
    setForm({
      label: u.label || '', kind: u.kind || 'unit',
      bedrooms: u.bedrooms ?? '', bathrooms: u.bathrooms ?? '', sqft: u.sqft ?? '',
      market_rent: u.market_rent ?? '', status: u.status || 'vacant', notes: u.notes || '',
    })
    setError(''); setShowForm(true)
  }

  async function save() {
    if (!form.label.trim()) { setError('Label is required (e.g. "Unit A", "Room 1")'); return }
    setSaving(true); setError('')
    const payload: any = {
      property_id: propertyId,
      label: form.label.trim(),
      kind: form.kind,
      bedrooms: form.bedrooms !== '' ? parseFloat(form.bedrooms) : null,
      bathrooms: form.bathrooms !== '' ? parseFloat(form.bathrooms) : null,
      sqft: form.sqft !== '' ? parseInt(form.sqft) : null,
      market_rent: form.market_rent !== '' ? parseFloat(form.market_rent) : null,
      status: form.status,
      notes: form.notes || null,
    }
    const { error: err } = editId
      ? await supabase.from('units').update(payload).eq('id', editId)
      : await supabase.from('units').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowForm(false); load()
  }

  async function del(u: any) {
    const occupant = tenantFor(u)
    if (occupant && occupant.unit_id === u.id) {
      alert('“' + u.label + '” is assigned to ' + occupant.full_name + '. Reassign that tenant to another unit first.')
      return
    }
    if (!confirm('Delete unit “' + u.label + '”?')) return
    const { error: err } = await supabase.from('units').delete().eq('id', u.id)
    if (err) { alert('Error: ' + err.message); return }
    load()
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>🏘 Units & Rooms</div>
        <button onClick={openAdd} className='btn btn-primary'>+ Add Unit</button>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', maxWidth: '620px' }}>
        Split this property into separately-leased units or rooms. Each unit can hold its own tenant, lease, and rent — useful for duplexes, multifamily, or renting by the room.
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '8px' }}>{[0, 1].map(i => <div key={i} className='skeleton' style={{ height: '70px' }} />)}</div>
      ) : units.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text3)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏘</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>No units yet</div>
          <button onClick={openAdd} className='btn btn-primary'>+ Add the first unit</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: '12px' }}>
          {units.map(u => {
            const occ = tenantFor(u)
            const isOcc = !!occ || u.status === 'occupied'
            return (
              <div key={u.id} style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{u.label}</div>
                  <span className={'chip ' + (isOcc ? 'chip-g' : 'chip-a')}>{isOcc ? 'Occupied' : 'Vacant'}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px', textTransform: 'capitalize' }}>
                  {u.kind === 'room' ? 'Room' : 'Unit'}
                  {u.bedrooms != null ? ' · ' + u.bedrooms + 'bd' : ''}
                  {u.bathrooms != null ? ' / ' + u.bathrooms + 'ba' : ''}
                  {u.sqft ? ' · ' + Number(u.sqft).toLocaleString() + ' sqft' : ''}
                </div>
                {u.market_rent != null && <div style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600, marginTop: '6px' }}>{fm(u.market_rent)}/mo target</div>}
                <div style={{ fontSize: '12px', color: occ ? 'var(--text)' : 'var(--text3)', marginTop: '8px' }}>
                  {occ ? '👤 ' + occ.full_name : 'No tenant assigned'}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  <button onClick={() => openEdit(u)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>Edit</button>
                  {occ
                    ? <a href={'/tenants/' + occ.id} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>View Tenant</a>
                    : <a href={'/tenants/new?property=' + propertyId + '&unit=' + u.id} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>+ Assign Tenant</a>}
                  <button onClick={() => del(u)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '440px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{editId ? 'Edit Unit' : 'Add Unit'}</div>
            {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '12px', padding: '10px 14px', borderRadius: '7px', marginBottom: '12px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Label *</label>
                <input style={inp} placeholder='Unit A / Room 1 / 2515' value={form.label} onChange={e => setForm((f: any) => ({ ...f, label: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Kind</label>
                <select style={inp} value={form.kind} onChange={e => setForm((f: any) => ({ ...f, kind: e.target.value }))}>
                  {KINDS.map(k => <option key={k.v} value={k.v}>{k.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Beds</label><input style={inp} type='number' step='0.5' value={form.bedrooms} onChange={e => setForm((f: any) => ({ ...f, bedrooms: e.target.value }))} /></div>
              <div><label style={lbl}>Baths</label><input style={inp} type='number' step='0.5' value={form.bathrooms} onChange={e => setForm((f: any) => ({ ...f, bathrooms: e.target.value }))} /></div>
              <div><label style={lbl}>Sq Ft</label><input style={inp} type='number' value={form.sqft} onChange={e => setForm((f: any) => ({ ...f, sqft: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Target Rent /mo</label><input style={inp} type='number' placeholder='1500' value={form.market_rent} onChange={e => setForm((f: any) => ({ ...f, market_rent: e.target.value }))} /></div>
              <div>
                <label style={lbl}>Status</label>
                <select style={inp} value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                  <option value='vacant'>Vacant</option>
                  <option value='occupied'>Occupied</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className='btn btn-ghost'>Cancel</button>
              <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Saving…' : editId ? 'Save' : 'Add Unit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
