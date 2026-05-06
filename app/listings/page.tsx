'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function ListingsPage() {
  const [listings, setListings] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    property_id: '', rent_amount: '', title: '',
    description: '', available_date: '',
    min_lease_months: '12', pets_allowed: false,
    pet_deposit: '', is_active: true,
  })

  useEffect(() => {
    Promise.all([
      supabase.from('listings').select('*, properties(address, city, state, bedrooms, bathrooms, type)').eq('user_id', USER_ID).order('created_at', { ascending: false }),
      supabase.from('properties').select('id, address, bedrooms, bathrooms').eq('user_id', USER_ID).eq('occupancy_status', 'vacant'),
    ]).then(([l, p]) => {
      setListings(l.data || [])
      setProperties(p.data || [])
      setLoading(false)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.property_id) { setError('Please select a property'); return }
    if (!form.rent_amount) { setError('Rent amount is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('listings').insert({
      user_id: USER_ID,
      property_id: form.property_id,
      rent_amount: parseFloat(form.rent_amount),
      title: form.title || null,
      description: form.description || null,
      available_date: form.available_date || null,
      min_lease_months: parseInt(form.min_lease_months) || 12,
      pets_allowed: form.pets_allowed,
      pet_deposit: form.pet_deposit ? parseFloat(form.pet_deposit) : null,
      is_active: form.is_active,
    })
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.reload()
  }

  const active = listings.filter(l => l.is_active)
  const inactive = listings.filter(l => !l.is_active)

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const btnP = { background: 'var(--green)', color: 'var(--bg)', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
  const btnG = { background: 'transparent', color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Listings</div>
        <button style={btnP} onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : '+ New Listing'}</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Active Listings', value: active.length, color: 'var(--green)' },
            { label: 'Inactive', value: inactive.length, color: 'var(--text2)' },
            { label: 'Vacant Properties', value: properties.length, color: 'var(--amber)' },
            { label: 'Avg Rent', value: active.length ? fm(active.reduce((s,l) => s + l.rent_amount, 0) / active.length) : '—', color: 'var(--blue)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {showAdd && (
          <div style={{ ...card, border: '0.5px solid rgba(74,222,154,0.3)' }}>
            <div style={secTtl}>New Listing</div>
            {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
            <div style={{ ...g2, marginBottom: '12px' }}>
              <div><label style={lbl}>Property *</label>
                <select style={inp} value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                  <option value=''>Select vacant property...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
                {properties.length === 0 && <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '4px' }}>No vacant properties found.</div>}
              </div>
              <div><label style={lbl}>Monthly Rent *</label><input style={inp} type='number' placeholder='1500' value={form.rent_amount} onChange={e => set('rent_amount', e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Listing Title</label>
              <input style={inp} placeholder='e.g. Charming 3BR in Orlando' value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Description</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder='Describe the property...' value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div style={{ ...g3, marginBottom: '12px' }}>
              <div><label style={lbl}>Available Date</label><input style={inp} type='date' value={form.available_date} onChange={e => set('available_date', e.target.value)} /></div>
              <div><label style={lbl}>Min Lease (months)</label><input style={inp} type='number' placeholder='12' value={form.min_lease_months} onChange={e => set('min_lease_months', e.target.value)} /></div>
              <div><label style={lbl}>Pets Allowed</label>
                <select style={inp} value={form.pets_allowed ? 'true' : 'false'} onChange={e => set('pets_allowed', e.target.value === 'true')}>
                  <option value='false'>No Pets</option>
                  <option value='true'>Pets Allowed</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button style={btnG} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Listing'}</button>
            </div>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>}

        {!loading && active.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏠</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>No active listings</div>
            <div style={{ fontSize: '13px', marginBottom: '20px' }}>Create a listing for your vacant properties.</div>
            <button style={btnP} onClick={() => setShowAdd(true)}>+ New Listing</button>
          </div>
        )}

        {!loading && active.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Active Listings</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '12px' }}>
              {active.map(l => (
                <div key={l.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(74,222,154,0.2)', borderTop: '2px solid #4ADE9A', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{l.title || l.properties?.address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{l.properties?.address}</div>
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>{fm(l.rent_amount)}<span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'Plus Jakarta Sans' }}>/mo</span></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    {[
                      ['Available', l.available_date || 'Now'],
                      ['Min Lease', l.min_lease_months + ' mo'],
                      ['Pets', l.pets_allowed ? 'Allowed' : 'No Pets'],
                      ['Leads', l.total_leads || '0'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '6px 8px' }}>
                        <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase' }}>{k}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '1px' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {l.description && <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '10px', lineHeight: '1.5' }}>{l.description.substring(0, 100)}{l.description.length > 100 ? '...' : ''}</div>}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a href={'/applications/new?listing=' + l.id} style={{ ...btnG, fontSize: '11px', flex: 1, textAlign: 'center' }}>+ Application</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && inactive.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Inactive Listings</div>
            {inactive.map(l => (
              <div key={l.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{l.title || l.properties?.address}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{l.properties?.address}</div>
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text2)' }}>{fm(l.rent_amount)}/mo</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}