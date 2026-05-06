'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function EditPropertyPage({ params }: { params: { id: string } }) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    address: '', city: '', state: 'FL', zip: '',
    type: 'single_family', bedrooms: '', bathrooms: '',
    sqft: '', year_built: '', owner_entity: 'Self',
    purchase_price: '', market_value: '',
    occupancy_status: 'vacant', notes: ''
  })

  useEffect(() => {
    supabase.from('properties').select('*').eq('id', params.id).eq('user_id', USER_ID).single()
      .then(({ data }) => {
        if (data) setForm({
          address: data.address || '',
          city: data.city || '',
          state: data.state || 'FL',
          zip: data.zip || '',
          type: data.type || 'single_family',
          bedrooms: data.bedrooms ? String(data.bedrooms) : '',
          bathrooms: data.bathrooms ? String(data.bathrooms) : '',
          sqft: data.sqft ? String(data.sqft) : '',
          year_built: data.year_built ? String(data.year_built) : '',
          owner_entity: data.owner_entity || 'Self',
          purchase_price: data.purchase_price ? String(data.purchase_price) : '',
          market_value: data.market_value ? String(data.market_value) : '',
          occupancy_status: data.occupancy_status || 'vacant',
          notes: data.notes || '',
        })
        setLoading(false)
      })
  }, [params.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.address) { setError('Address is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('properties').update({
      address: form.address,
      city: form.city || null,
      state: form.state || 'FL',
      zip: form.zip || null,
      type: form.type || null,
      bedrooms: form.bedrooms ? parseFloat(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
      sqft: form.sqft ? parseInt(form.sqft) : null,
      year_built: form.year_built ? parseInt(form.year_built) : null,
      owner_entity: form.owner_entity || 'Self',
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      market_value: form.market_value ? parseFloat(form.market_value) : null,
      occupancy_status: form.occupancy_status,
      notes: form.notes || null,
    }).eq('id', params.id).eq('user_id', USER_ID)
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/properties/' + params.id
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const btnP = { background: 'var(--green)', color: 'var(--bg)', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const btnG = { background: 'transparent', color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href={'/properties/' + params.id} style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Back to Property</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>Edit Property</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={'/properties/' + params.id} style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Property Address</div>
          <div style={{ marginBottom: '12px' }}><label style={lbl}>Street Address *</label><input style={inp} placeholder='123 Main St' value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div style={g3}>
            <div><label style={lbl}>City</label><input style={inp} placeholder='Orlando' value={form.city} onChange={e => set('city', e.target.value)} /></div>
            <div><label style={lbl}>State</label><input style={inp} placeholder='FL' value={form.state} onChange={e => set('state', e.target.value)} /></div>
            <div><label style={lbl}>ZIP</label><input style={inp} placeholder='32803' value={form.zip} onChange={e => set('zip', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Property Details</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Type</label>
              <select style={inp} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value='single_family'>Single Family</option>
                <option value='condo'>Condo</option>
                <option value='duplex'>Duplex</option>
                <option value='multi_family'>Multi Family</option>
                <option value='commercial'>Commercial</option>
              </select>
            </div>
            <div><label style={lbl}>Ownership</label>
              <select style={inp} value={form.owner_entity} onChange={e => set('owner_entity', e.target.value)}>
                <option value='Self'>Self</option>
                <option value='LLC - PropCo'>LLC - PropCo</option>
                <option value='Trust'>Trust</option>
                <option value='Partnership'>Partnership</option>
              </select>
            </div>
          </div>
          <div style={{ ...g3, marginBottom: '12px' }}>
            <div><label style={lbl}>Bedrooms</label><input style={inp} type='number' placeholder='3' value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} /></div>
            <div><label style={lbl}>Bathrooms</label><input style={inp} type='number' step='0.5' placeholder='2' value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} /></div>
            <div><label style={lbl}>Sq Ft</label><input style={inp} type='number' placeholder='1400' value={form.sqft} onChange={e => set('sqft', e.target.value)} /></div>
          </div>
          <div style={g2}>
            <div><label style={lbl}>Year Built</label><input style={inp} type='number' placeholder='1990' value={form.year_built} onChange={e => set('year_built', e.target.value)} /></div>
            <div><label style={lbl}>Occupancy</label>
              <select style={inp} value={form.occupancy_status} onChange={e => set('occupancy_status', e.target.value)}>
                <option value='vacant'>Vacant</option>
                <option value='occupied'>Occupied</option>
              </select>
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Financial Details</div>
          <div style={g2}>
            <div><label style={lbl}>Purchase Price</label><input style={inp} type='number' placeholder='285000' value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} /></div>
            <div><label style={lbl}>Market Value</label><input style={inp} type='number' placeholder='320000' value={form.market_value} onChange={e => set('market_value', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Notes</div>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder='Any notes about this property...' value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href={'/properties/' + params.id} style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </AppShell>
  )
}