'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function NewPropertyPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    address: '', city: '', state: 'FL', zip: '',
    type: 'single_family', bedrooms: '', bathrooms: '',
    sqft: '', owner_entity: 'Self',
    purchase_price: '', market_value: '',
    occupancy_status: 'vacant', notes: ''
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  async function save() {
    if (!form.address) { alert('Address is required'); return }
    setSaving(true)
    const { error } = await supabase.from('properties').insert({
      user_id: USER_ID, address: form.address, city: form.city||null,
      state: form.state||'FL', zip: form.zip||null, type: form.type||null,
      bedrooms: form.bedrooms ? parseFloat(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
      sqft: form.sqft ? parseInt(form.sqft) : null,
      owner_entity: form.owner_entity||'Self',
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      market_value: form.market_value ? parseFloat(form.market_value) : null,
      occupancy_status: form.occupancy_status, notes: form.notes||null,
    })
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    router.push('/properties')
  }
  const inp = { width:'100%', padding:'8px 11px', fontSize:'13px', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:'7px', background:'#1E1E1B', color:'#F0EEE8', fontFamily:'Plus Jakarta Sans, sans-serif', outline:'none', boxSizing:'border-box' as const }
  const sel = { ...inp }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.05em', color:'#5A5A56', marginBottom:'4px' }
  const card = { background:'#161614', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'20px', marginBottom:'14px' }
  const g2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }
  const g3 = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }
  const secTtl = { fontSize:'11px', fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'#5A5A56', marginBottom:'12px' }
  const btnP = { background:'#4ADE9A', color:'#0E0E0C', border:'none', borderRadius:'7px', padding:'8px 18px', fontSize:'13px', fontWeight:700, cursor:'pointer' as const, fontFamily:'Plus Jakarta Sans, sans-serif' }
  const btnG = { background:'transparent', color:'#A8A69E', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:'7px', padding:'8px 14px', fontSize:'12px', cursor:'pointer' as const, fontFamily:'Plus Jakarta Sans, sans-serif' }
  return (
    <AppShell>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', background:'#161614', flexShrink:0 }}>
        <div style={{ fontFamily:'Syne, sans-serif', fontSize:'16px', fontWeight:700, color:'#F0EEE8' }}>Add New Property</div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button style={btnG} onClick={() => router.push('/properties')}>Cancel</button>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Property'}</button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto' as const, padding:'20px' }}>
        <div style={card}>
          <div style={secTtl}>Property Address</div>
          <div style={{ marginBottom:'12px' }}><label style={lbl}>Street Address *</label><input style={inp} placeholder="123 Main St" value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div style={g3}>
            <div><label style={lbl}>City</label><input style={inp} placeholder="Orlando" value={form.city} onChange={e => set('city', e.target.value)} /></div>
            <div><label style={lbl}>State</label><input style={inp} placeholder="FL" value={form.state} onChange={e => set('state', e.target.value)} /></div>
            <div><label style={lbl}>ZIP</label><input style={inp} placeholder="32803" value={form.zip} onChange={e => set('zip', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Property Details</div>
          <div style={{ ...g2, marginBottom:'12px' }}>
            <div><label style={lbl}>Type</label><select style={sel} value={form.type} onChange={e => set('type', e.target.value)}><option value="single_family">Single Family</option><option value="condo">Condo</option><option value="duplex">Duplex</option><option value="multi_family">Multi Family</option><option value="commercial">Commercial</option></select></div>
            <div><label style={lbl}>Ownership</label><select style={sel} value={form.owner_entity} onChange={e => set('owner_entity', e.target.value)}><option value="Self">Self</option><option value="LLC - PropCo">LLC - PropCo</option><option value="Trust">Trust</option><option value="Partnership">Partnership</option></select></div>
          </div>
          <div style={{ ...g3, marginBottom:'12px' }}>
            <div><label style={lbl}>Bedrooms</label><input style={inp} type="number" placeholder="3" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} /></div>
            <div><label style={lbl}>Bathrooms</label><input style={inp} type="number" step="0.5" placeholder="2" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} /></div>
            <div><label style={lbl}>Sq Ft</label><input style={inp} type="number" placeholder="1400" value={form.sqft} onChange={e => set('sqft', e.target.value)} /></div>
          </div>
          <div style={g2}>
            <div><label style={lbl}>Occupancy</label><select style={sel} value={form.occupancy_status} onChange={e => set('occupancy_status', e.target.value)}><option value="vacant">Vacant</option><option value="occupied">Occupied</option></select></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Financial Details</div>
          <div style={g2}>
            <div><label style={lbl}>Purchase Price</label><input style={inp} type="number" placeholder="285000" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} /></div>
            <div><label style={lbl}>Market Value</label><input style={inp} type="number" placeholder="320000" value={form.market_value} onChange={e => set('market_value', e.target.value)} /></div>
          </div>
        </div>
        <div style={card}>
          <div style={secTtl}>Notes</div>
          <textarea style={{ ...inp, resize:'vertical' as const }} rows={3} placeholder="Any notes about this property..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
          <button style={btnG} onClick={() => router.push('/properties')}>Cancel</button>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Property'}</button>
        </div>
      </div>
    </AppShell>
  )
}
