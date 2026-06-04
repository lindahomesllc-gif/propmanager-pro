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

  async function toggleActive(id, isActive) {
    const { error: err } = await supabase.from('listings').update({ is_active: !isActive }).eq('id', id).eq('user_id', USER_ID)
    if (err) { alert('Error: ' + err.message); return }
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active: !isActive } : l))
  }

  async function deleteListing(id) {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    const { error: err } = await supabase.from('listings').delete().eq('id', id).eq('user_id', USER_ID)
    if (err) { alert('Error: ' + err.message); return }
    setListings(prev => prev.filter(l => l.id !== id))
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '🏠 Active', value: active.length, color: 'var(--green)' },
          { label: '📭 Inactive', value: inactive.length, color: 'var(--text3)' },
          { label: '🏚 Vacant', value: properties.length, color: 'var(--amber)' },
          { label: '💰 Avg Rent', value: listings.length ? '$' + Math.round(listings.reduce((s,l) => s + (l.rent_amount||0), 0) / listings.length).toLocaleString() : '—', color: 'var(--blue)' },
        ].map((mc, i) => (
          <div key={mc.label} style={{ padding: '14px 20px', background: 'var(--bg2)', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {showAdd && (
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>+ New Listing</div>
            {error && <div style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '10px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px' }}>Title</div>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder='e.g. 2BR in Sanford' style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px' }}>Rent Amount</div>
                <input value={form.rent_amount} onChange={e => setForm(f => ({...f, rent_amount: e.target.value}))} placeholder='1500' type='number' style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px' }}>Property</div>
                <select value={form.property_id} onChange={e => setForm(f => ({...f, property_id: e.target.value}))} style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }}>
                  <option value=''>Select property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px' }}>Available Date</div>
                <input value={form.available_date} onChange={e => setForm(f => ({...f, available_date: e.target.value}))} type='date' style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} placeholder='Describe the unit...' style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <button onClick={save} disabled={saving} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save Listing'}</button>
          </div>
        )}
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>}
        {!loading && listings.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '16px' }}>No listings yet</div>
            <button onClick={() => setShowAdd(true)} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ New Listing</button>
          </div>
        )}
        {!loading && listings.length > 0 && (
          <div style={{ display: 'grid', gap: '10px' }}>
            {listings.map(l => (
              <div key={l.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + (l.is_active ? 'var(--green)' : 'var(--text3)'), borderRadius: '10px', padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{l.title || l.properties?.address}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>📍 {l.properties?.address}{l.available_date ? ' · Available ' + l.available_date : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--green)' }}>${l.rent_amount?.toLocaleString()}/mo</div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: l.is_active ? 'var(--green-bg)' : 'var(--bg3)', color: l.is_active ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>{l.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                {l.description && <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px', lineHeight: 1.5 }}>{l.description}</div>}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => toggleActive(l.id, l.is_active)} style={{ background: l.is_active ? 'var(--amber-bg)' : 'var(--green-bg)', color: l.is_active ? 'var(--amber)' : 'var(--green)', border: '0.5px solid ' + (l.is_active ? 'var(--amber)' : 'var(--green)'), borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>{l.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => deleteListing(l.id)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}