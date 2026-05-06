'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function EditPropertyPage({ params }) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      return p.get('tab') || 'basic'
    }
    return 'basic'
  })
  const [form, setForm] = useState({
    address: '', city: '', state: 'FL', zip: '',
    type: 'single_family', bedrooms: '', bathrooms: '',
    sqft: '', year_built: '', owner_entity: 'Self',
    purchase_price: '', purchase_date: '', market_value: '',
    occupancy_status: 'vacant', notes: '',
    county: '', parcel_id: '', alt_key: '', prop_description: '',
    assessed_value: '', annual_tax: '',
    insurance_company: '', insurance_policy: '', insurance_premium: '',
    insurance_start: '', insurance_expires: '', insurance_agent: '',
    utility_electric: '', utility_water: '', utility_gas: '',
    utility_trash: '', utility_internet: '', utility_cable: '',
    school_elementary: '', school_middle: '', school_high: '', school_district: '',
    hoa: false, hoa_fee: '', hoa_name: '', hoa_contact: '',
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
          purchase_date: data.purchase_date || '',
          market_value: data.market_value ? String(data.market_value) : '',
          occupancy_status: data.occupancy_status || 'vacant',
          notes: data.notes || '',
          county: data.county || '',
          parcel_id: data.parcel_id || '',
          alt_key: data.alt_key || '',
          prop_description: data.prop_description || '',
          assessed_value: data.assessed_value ? String(data.assessed_value) : '',
          annual_tax: data.annual_tax ? String(data.annual_tax) : '',
          insurance_company: data.insurance_company || '',
          insurance_policy: data.insurance_policy || '',
          insurance_premium: data.insurance_premium ? String(data.insurance_premium) : '',
          insurance_start: data.insurance_start || '',
          insurance_expires: data.insurance_expires || '',
          insurance_agent: data.insurance_agent || '',
          utility_electric: data.utility_electric || '',
          utility_water: data.utility_water || '',
          utility_gas: data.utility_gas || '',
          utility_trash: data.utility_trash || '',
          utility_internet: data.utility_internet || '',
          utility_cable: data.utility_cable || '',
          school_elementary: data.school_elementary || '',
          school_middle: data.school_middle || '',
          school_high: data.school_high || '',
          school_district: data.school_district || '',
          hoa: data.hoa || false,
          hoa_fee: data.hoa_fee ? String(data.hoa_fee) : '',
          hoa_name: data.hoa_name || '',
          hoa_contact: data.hoa_contact || '',
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
      purchase_date: form.purchase_date || null,
      market_value: form.market_value ? parseFloat(form.market_value) : null,
      occupancy_status: form.occupancy_status,
      notes: form.notes || null,
      county: form.county || null,
      parcel_id: form.parcel_id || null,
      alt_key: form.alt_key || null,
      prop_description: form.prop_description || null,
      assessed_value: form.assessed_value ? parseFloat(form.assessed_value) : null,
      annual_tax: form.annual_tax ? parseFloat(form.annual_tax) : null,
      insurance_company: form.insurance_company || null,
      insurance_policy: form.insurance_policy || null,
      insurance_premium: form.insurance_premium ? parseFloat(form.insurance_premium) : null,
      insurance_start: form.insurance_start || null,
      insurance_expires: form.insurance_expires || null,
      insurance_agent: form.insurance_agent || null,
      utility_electric: form.utility_electric || null,
      utility_water: form.utility_water || null,
      utility_gas: form.utility_gas || null,
      utility_trash: form.utility_trash || null,
      utility_internet: form.utility_internet || null,
      utility_cable: form.utility_cable || null,
      school_elementary: form.school_elementary || null,
      school_middle: form.school_middle || null,
      school_high: form.school_high || null,
      school_district: form.school_district || null,
      hoa: form.hoa,
      hoa_fee: form.hoa_fee ? parseFloat(form.hoa_fee) : null,
      hoa_name: form.hoa_name || null,
      hoa_contact: form.hoa_contact || null,
    }).eq('id', params.id).eq('user_id', USER_ID)
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/properties/' + params.id
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const btnP = { background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
  const btnG = { background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }
  const tabs = ['basic', 'tax', 'insurance', 'utilities', 'hoa']
  const tabLabels = { basic: 'Basic Info', tax: 'Tax & Appraiser', insurance: 'Insurance', utilities: 'Utilities & Schools', hoa: 'HOA' }

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href={'/properties/' + params.id} style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Back to Property</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>Edit Property</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={'/properties/' + params.id} style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', overflowX: 'auto', flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent', background: 'transparent', color: tab === t ? 'var(--green)' : 'var(--text2)', fontWeight: tab === t ? 600 : 400 }}>{tabLabels[t]}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: 'var(--red)', fontSize: '13px' }}>{error}</div>}

        {tab === 'basic' && (
          <>
            <div style={card}>
              <div style={secTtl}>Property Address</div>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Street Address *</label><input style={inp} value={form.address} onChange={e => set('address', e.target.value)} /></div>
              <div style={g3}>
                <div><label style={lbl}>City</label><input style={inp} value={form.city} onChange={e => set('city', e.target.value)} /></div>
                <div><label style={lbl}>State</label><input style={inp} value={form.state} onChange={e => set('state', e.target.value)} /></div>
                <div><label style={lbl}>ZIP</label><input style={inp} value={form.zip} onChange={e => set('zip', e.target.value)} /></div>
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
                <div><label style={lbl}>Bedrooms</label><input style={inp} type='number' value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} /></div>
                <div><label style={lbl}>Bathrooms</label><input style={inp} type='number' step='0.5' value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} /></div>
                <div><label style={lbl}>Sq Ft</label><input style={inp} type='number' value={form.sqft} onChange={e => set('sqft', e.target.value)} /></div>
              </div>
              <div style={{ ...g3, marginBottom: '12px' }}>
                <div><label style={lbl}>Year Built</label><input style={inp} type='number' value={form.year_built} onChange={e => set('year_built', e.target.value)} /></div>
                <div><label style={lbl}>Occupancy</label>
                  <select style={inp} value={form.occupancy_status} onChange={e => set('occupancy_status', e.target.value)}>
                    <option value='vacant'>Vacant</option>
                    <option value='occupied'>Occupied</option>
                  </select>
                </div>
                <div><label style={lbl}>Purchase Date</label><input style={inp} type='date' value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} /></div>
              </div>
              <div style={g2}>
                <div><label style={lbl}>Purchase Price</label><input style={inp} type='number' value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} /></div>
                <div><label style={lbl}>Market Value</label><input style={inp} type='number' value={form.market_value} onChange={e => set('market_value', e.target.value)} /></div>
              </div>
            </div>
            <div style={card}>
              <div style={secTtl}>Notes</div>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </>
        )}

        {tab === 'tax' && (
          <div style={card}>
            <div style={secTtl}>County Appraiser Info</div>
            <div style={{ ...g3, marginBottom: '12px' }}>
              <div><label style={lbl}>County</label><input style={inp} placeholder='Seminole' value={form.county} onChange={e => set('county', e.target.value)} /></div>
              <div><label style={lbl}>Parcel ID</label><input style={inp} placeholder='12-34-56-789' value={form.parcel_id} onChange={e => set('parcel_id', e.target.value)} /></div>
              <div><label style={lbl}>Alt Key</label><input style={inp} placeholder='1234567' value={form.alt_key} onChange={e => set('alt_key', e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: '12px' }}><label style={lbl}>Property Description</label><input style={inp} placeholder='LOT 4 BLK 2 EXAMPLE SUB' value={form.prop_description} onChange={e => set('prop_description', e.target.value)} /></div>
            <div style={g3}>
              <div><label style={lbl}>Assessed Value</label><input style={inp} type='number' value={form.assessed_value} onChange={e => set('assessed_value', e.target.value)} /></div>
              <div><label style={lbl}>Annual Tax</label><input style={inp} type='number' value={form.annual_tax} onChange={e => set('annual_tax', e.target.value)} /></div>
            </div>
          </div>
        )}

        {tab === 'insurance' && (
          <div style={card}>
            <div style={secTtl}>Insurance Details</div>
            <div style={{ ...g3, marginBottom: '12px' }}>
              <div><label style={lbl}>Insurance Company</label><input style={inp} placeholder='Citizens, Universal, etc.' value={form.insurance_company} onChange={e => set('insurance_company', e.target.value)} /></div>
              <div><label style={lbl}>Policy Number</label><input style={inp} value={form.insurance_policy} onChange={e => set('insurance_policy', e.target.value)} /></div>
              <div><label style={lbl}>Annual Premium</label><input style={inp} type='number' value={form.insurance_premium} onChange={e => set('insurance_premium', e.target.value)} /></div>
            </div>
            <div style={g3}>
              <div><label style={lbl}>Policy Start</label><input style={inp} type='date' value={form.insurance_start} onChange={e => set('insurance_start', e.target.value)} /></div>
              <div><label style={lbl}>Policy Expires</label><input style={inp} type='date' value={form.insurance_expires} onChange={e => set('insurance_expires', e.target.value)} /></div>
              <div><label style={lbl}>Agent Name</label><input style={inp} value={form.insurance_agent} onChange={e => set('insurance_agent', e.target.value)} /></div>
            </div>
          </div>
        )}

        {tab === 'utilities' && (
          <>
            <div style={card}>
              <div style={secTtl}>Utility Companies</div>
              <div style={{ ...g3, marginBottom: '12px' }}>
                <div><label style={lbl}>Electric</label><input style={inp} placeholder='Duke Energy' value={form.utility_electric} onChange={e => set('utility_electric', e.target.value)} /></div>
                <div><label style={lbl}>Water</label><input style={inp} placeholder='County Water' value={form.utility_water} onChange={e => set('utility_water', e.target.value)} /></div>
                <div><label style={lbl}>Gas</label><input style={inp} placeholder='TECO Peoples Gas' value={form.utility_gas} onChange={e => set('utility_gas', e.target.value)} /></div>
              </div>
              <div style={g3}>
                <div><label style={lbl}>Trash</label><input style={inp} placeholder='Waste Pro' value={form.utility_trash} onChange={e => set('utility_trash', e.target.value)} /></div>
                <div><label style={lbl}>Internet</label><input style={inp} placeholder='Spectrum, AT&T' value={form.utility_internet} onChange={e => set('utility_internet', e.target.value)} /></div>
                <div><label style={lbl}>Cable</label><input style={inp} placeholder='Spectrum' value={form.utility_cable} onChange={e => set('utility_cable', e.target.value)} /></div>
              </div>
            </div>
            <div style={card}>
              <div style={secTtl}>Schools</div>
              <div style={{ ...g2, marginBottom: '12px' }}>
                <div><label style={lbl}>School District</label><input style={inp} placeholder='Seminole County Schools' value={form.school_district} onChange={e => set('school_district', e.target.value)} /></div>
                <div><label style={lbl}>Elementary School</label><input style={inp} value={form.school_elementary} onChange={e => set('school_elementary', e.target.value)} /></div>
              </div>
              <div style={g2}>
                <div><label style={lbl}>Middle School</label><input style={inp} value={form.school_middle} onChange={e => set('school_middle', e.target.value)} /></div>
                <div><label style={lbl}>High School</label><input style={inp} value={form.school_high} onChange={e => set('school_high', e.target.value)} /></div>
              </div>
            </div>
          </>
        )}

        {tab === 'hoa' && (
          <div style={card}>
            <div style={secTtl}>HOA Information</div>
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>HOA</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                  <input type='radio' name='hoa' value='true' checked={form.hoa === true} onChange={() => set('hoa', true)} /> Yes — Has HOA
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                  <input type='radio' name='hoa' value='false' checked={form.hoa === false} onChange={() => set('hoa', false)} /> No HOA
                </label>
              </div>
            </div>
            {form.hoa && (
              <div style={g3}>
                <div><label style={lbl}>HOA Name</label><input style={inp} placeholder='Lakeside HOA' value={form.hoa_name} onChange={e => set('hoa_name', e.target.value)} /></div>
                <div><label style={lbl}>Monthly Fee</label><input style={inp} type='number' placeholder='150' value={form.hoa_fee} onChange={e => set('hoa_fee', e.target.value)} /></div>
                <div><label style={lbl}>HOA Contact</label><input style={inp} placeholder='Phone or email' value={form.hoa_contact} onChange={e => set('hoa_contact', e.target.value)} /></div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <a href={'/properties/' + params.id} style={btnG}>Cancel</a>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </AppShell>
  )
}