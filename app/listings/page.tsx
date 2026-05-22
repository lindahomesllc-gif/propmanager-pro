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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '🏠 Active', value: active.length, color: 'var(--green)' },
          { label: '📭 Inactive', value: inactive.length, color: 'var(--text3)' },
          { label: '🏚 Vacant', value: properties.filter(p => p.occupancy_status === 'vacant').length, color: 'var(--amber)' },
          { label: '💰 Avg Rent', value: listings.length ? '$' + Math.round(listings.reduce((s,l) => s + (l.rent_amount||0), 0) / listings.length).toLocaleString() : '—', color: 'var(--blue)' },
        ].map((mc, i) => (
          <div key={mc.label} style={{ padding: '14px 20px', background: 'var(--bg2)', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}