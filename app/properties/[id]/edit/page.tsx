'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm } from '@/lib/supabase'

export default function EditPropertyPage({ params }) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('basic')
  const [entities, setEntities] = useState<any[]>([])
  const [loanTotal, setLoanTotal] = useState(0)

  useEffect(() => { supabase.from('entities').select('id, name').order('name').then(({ data }) => setEntities(data || [])) }, [])

  useEffect(() => {
    const hash = document.location.hash.replace('#', '')
    const search = new URLSearchParams(document.location.search).get('tab')
    const target = hash || search
    if (target) setTab(target)
  }, [loading])

  const [form, setForm] = useState({
    address: '', city: '', state: 'FL', zip: '', num_units: '1',
    type: 'single_family', bedrooms: '', bathrooms: '',
    sqft: '', year_built: '', entity_id: '',
    purchase_price: '', purchase_date: '', market_value: '', ownership_percentage: '100', cash_invested: '',
    deal_type: 'buy', land_cost: '', construction_cost: '', soft_costs: '', rehab_cost: '', closing_costs: '', financing_costs: '',
    occupancy_status: 'vacant', notes: '',
    county: '', parcel_id: '', alt_key: '', prop_description: '',
    assessed_value: '', annual_tax: '', tax_due_date: '',
    insurance_company: '', insurance_policy: '', insurance_premium: '',
    insurance_start: '', insurance_expires: '', insurance_agent: '',
    utility_electric: '', utility_water: '', utility_gas: '',
    utility_trash: '', utility_internet: '', utility_cable: '',
    school_elementary: '', school_middle: '', school_high: '', school_district: '',
    hoa: false, hoa_fee: '', hoa_name: '', hoa_contact: '',
  })

  useEffect(() => {
    supabase.from('properties').select('*').eq('id', params.id).single()
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
          entity_id: data.entity_id || '',
          purchase_price: data.purchase_price ? String(data.purchase_price) : '',
          purchase_date: data.purchase_date || '',
          market_value: data.market_value ? String(data.market_value) : '',
          cash_invested: data.cash_invested ? String(data.cash_invested) : '',
          deal_type: data.deal_type || 'buy',
          land_cost: data.land_cost ? String(data.land_cost) : '',
          construction_cost: data.construction_cost ? String(data.construction_cost) : '',
          soft_costs: data.soft_costs ? String(data.soft_costs) : '',
          rehab_cost: data.rehab_cost ? String(data.rehab_cost) : '',
          closing_costs: data.closing_costs ? String(data.closing_costs) : '',
          financing_costs: data.financing_costs ? String(data.financing_costs) : '',
          ownership_percentage: data.ownership_percentage != null ? String(data.ownership_percentage) : '100',
          num_units: data.num_units ? String(data.num_units) : '1',
          occupancy_status: data.occupancy_status || 'vacant',
          notes: data.notes || '',
          county: data.county || '',
          parcel_id: data.parcel_id || '',
          alt_key: data.alt_key || '',
          prop_description: data.prop_description || '',
          assessed_value: data.assessed_value ? String(data.assessed_value) : '',
          annual_tax: data.annual_tax ? String(data.annual_tax) : '',
          tax_due_date: data.tax_due_date || '',
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
        // total borrowed against the property — used to suggest cash invested (cost − loans)
        supabase.from('mortgages').select('original_amount').eq('property_id', params.id).then(({ data: ms }) => {
          setLoanTotal((ms || []).reduce((s: number, m: any) => s + (m.original_amount || 0), 0))
        })
      })
  }, [params.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Project cost breakdown → total basis, suggested cash invested, and created equity.
  const nf = (v: string) => parseFloat(v) || 0
  const isBuild = form.deal_type === 'build'
  const acquisition = isBuild ? nf(form.land_cost) : nf(form.purchase_price)
  const totalProjectCost = acquisition + nf(form.construction_cost) + nf(form.soft_costs) + nf(form.rehab_cost) + nf(form.closing_costs) + nf(form.financing_costs)
  const suggestedCash = totalProjectCost > 0 ? Math.max(0, totalProjectCost - loanTotal) : null
  const createdEquity = nf(form.market_value) > 0 && totalProjectCost > 0 ? nf(form.market_value) - totalProjectCost : null

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
      entity_id: form.entity_id || null,
      owner_entity: entities.find(e => e.id === form.entity_id)?.name || null,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      purchase_date: form.purchase_date || null,
      market_value: form.market_value ? parseFloat(form.market_value) : null,
      cash_invested: form.cash_invested ? parseFloat(form.cash_invested) : null,
      deal_type: form.deal_type || 'buy',
      land_cost: form.land_cost ? parseFloat(form.land_cost) : null,
      construction_cost: form.construction_cost ? parseFloat(form.construction_cost) : null,
      soft_costs: form.soft_costs ? parseFloat(form.soft_costs) : null,
      rehab_cost: form.rehab_cost ? parseFloat(form.rehab_cost) : null,
      closing_costs: form.closing_costs ? parseFloat(form.closing_costs) : null,
      financing_costs: form.financing_costs ? parseFloat(form.financing_costs) : null,
      ownership_percentage: form.ownership_percentage !== '' ? parseFloat(form.ownership_percentage) : 100,
      num_units: parseInt(form.num_units) || 1,
      occupancy_status: form.occupancy_status,
      notes: form.notes || null,
      county: form.county || null,
      parcel_id: form.parcel_id || null,
      alt_key: form.alt_key || null,
      prop_description: form.prop_description || null,
      assessed_value: form.assessed_value ? parseFloat(form.assessed_value) : null,
      annual_tax: form.annual_tax ? parseFloat(form.annual_tax) : null,
      tax_due_date: form.tax_due_date || null,
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
    }).eq('id', params.id)
    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    window.location.href = '/properties/' + params.id
  }

  async function delProperty() {
    // Block deletion while records are attached — protects financial/tenant history.
    const [{ count: tCount }, { count: lCount }, { count: mCount }] = await Promise.all([
      supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('property_id', params.id),
      supabase.from('leases').select('id', { count: 'exact', head: true }).eq('property_id', params.id),
      supabase.from('mortgages').select('id', { count: 'exact', head: true }).eq('property_id', params.id),
    ])
    const t = tCount || 0, l = lCount || 0, m = mCount || 0
    if (t > 0 || l > 0 || m > 0) {
      alert('This property has ' + t + ' tenant(s), ' + l + ' lease(s), and ' + m + ' mortgage(s) attached.\n\nReassign or remove those first — a property with active records can’t be deleted, to protect your data.')
      return
    }
    if (!confirm('Delete this property? This cannot be undone.')) return
    const { error } = await supabase.from('properties').delete().eq('id', params.id)
    if (error) { alert('Error: ' + error.message); return }
    window.location.href = '/properties'
  }

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
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
          <button onClick={delProperty} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>Delete</button>
          <a href={'/properties/' + params.id} className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
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
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Street Address *</label><input className='input' value={form.address} onChange={e => set('address', e.target.value)} /></div>
              <div style={g3}>
                <div><label style={lbl}>City</label><input className='input' value={form.city} onChange={e => set('city', e.target.value)} /></div>
                <div><label style={lbl}>State</label><input className='input' value={form.state} onChange={e => set('state', e.target.value)} /></div>
                <div><label style={lbl}>ZIP</label><input className='input' value={form.zip} onChange={e => set('zip', e.target.value)} /></div>
              </div>
            </div>
            <div style={card}>
              <div style={secTtl}>Property Details</div>
              <div style={{ ...g2, marginBottom: '12px' }}>
                <div><label style={lbl}>Type</label>
                  <select className='input' value={form.type} onChange={e => { const t = e.target.value; set('type', t); if (t === 'single_family' || t === 'condo') set('num_units', '1'); else if (t === 'duplex') set('num_units', '2'); else if (t === 'triplex') set('num_units', '3'); else if (t === 'quadplex') set('num_units', '4'); else if (t === 'multi_family') set('num_units', '4'); }}>
                    <option value='single_family'>Single Family</option>
                    <option value='triplex'>Triplex</option>
                    <option value='quadplex'>Quadplex</option>
                    <option value='condo'>Condo</option>
                    <option value='duplex'>Duplex</option>
                    <option value='multi_family'>Multi Family</option>
                    <option value='commercial'>Commercial</option>
                  </select>
                </div>
                <div><label style={lbl}>Owned by (Entity)</label>
                  <select className='input' value={form.entity_id} onChange={e => set('entity_id', e.target.value)}>
                    <option value=''>— Unassigned —</option>
                    {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ ...g3, marginBottom: '12px' }}>
                <div><label style={lbl}>Bedrooms</label><input className='input' type='number' value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} /></div>
                <div><label style={lbl}>Bathrooms</label><input className='input' type='number' step='0.5' value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} /></div>
                <div><label style={lbl}>Sq Ft</label><input className='input' type='number' value={form.sqft} onChange={e => set('sqft', e.target.value)} /></div>
              </div>
              <div style={{ ...g3, marginBottom: '12px' }}>
                <div><label style={lbl}>Year Built</label><input className='input' type='number' value={form.year_built} onChange={e => set('year_built', e.target.value)} /></div>
                <div><label style={lbl}>Number of Units</label><input className='input' type='number' min='1' max='20' value={form.num_units} onChange={e => set('num_units', e.target.value)} /></div>
                <div><label style={lbl}>Occupancy</label>
                  <select className='input' value={form.occupancy_status} onChange={e => set('occupancy_status', e.target.value)}>
                    <option value='vacant'>Vacant</option>
                    <option value='occupied'>Occupied</option>
                  </select>
                </div>
                <div><label style={lbl}>Purchase Date</label><input className='input' type='date' value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} /></div>
              </div>
              <div style={g3}>
                <div><label style={lbl}>Purchase Price</label><input className='input' type='number' value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} /></div>
                <div><label style={lbl}>Market Value</label><input className='input' type='number' value={form.market_value} onChange={e => set('market_value', e.target.value)} /></div>
                <div><label style={lbl}>Your Ownership %</label><input className='input' type='number' min='0' max='100' step='0.01' placeholder='100' value={form.ownership_percentage} onChange={e => set('ownership_percentage', e.target.value)} /></div>
                <div><label style={lbl}>Cash Invested</label><input className='input' type='number' placeholder='your out-of-pocket' value={form.cash_invested} onChange={e => set('cash_invested', e.target.value)} />
                  <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '3px', lineHeight: 1.5 }}>
                    Your out-of-pocket equity (not borrowed). Fill the cost breakdown below and it&apos;ll suggest this for you.
                    {suggestedCash != null && (
                      <> <button type='button' onClick={() => set('cash_invested', String(Math.round(suggestedCash)))} style={{ background: 'transparent', border: 'none', color: 'var(--green)', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: '10px' }}>↳ use ${Math.round(suggestedCash).toLocaleString()} (cost − loans)</button></>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Project / Acquisition Cost breakdown — works for both bought-existing and built ground-up */}
            <div style={card}>
              <div style={secTtl}>Project / Acquisition Costs</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {[['buy', '🏠 Bought existing'], ['build', '🏗 Built ground-up']].map(([v, l]) => (
                  <button key={v} type='button' onClick={() => set('deal_type', v)} style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '8px', border: '0.5px solid ' + (form.deal_type === v ? 'var(--green)' : 'var(--border2)'), background: form.deal_type === v ? 'var(--green-bg)' : 'transparent', color: form.deal_type === v ? 'var(--green)' : 'var(--text2)', cursor: 'pointer', fontWeight: form.deal_type === v ? 700 : 400 }}>{l}</button>
                ))}
              </div>
              <div style={g3}>
                {isBuild ? (
                  <>
                    <div><label style={lbl}>Land / Lot Cost</label><input className='input' type='number' placeholder='99000' value={form.land_cost} onChange={e => set('land_cost', e.target.value)} /></div>
                    <div><label style={lbl}>Construction (hard costs)</label><input className='input' type='number' placeholder='build cost' value={form.construction_cost} onChange={e => set('construction_cost', e.target.value)} /></div>
                    <div><label style={lbl}>Soft Costs</label><input className='input' type='number' placeholder='permits, architect, fees' value={form.soft_costs} onChange={e => set('soft_costs', e.target.value)} /></div>
                  </>
                ) : (
                  <>
                    <div><label style={lbl}>Rehab / Improvements</label><input className='input' type='number' placeholder='renovation cost' value={form.rehab_cost} onChange={e => set('rehab_cost', e.target.value)} /></div>
                  </>
                )}
                <div><label style={lbl}>Closing Costs</label><input className='input' type='number' placeholder='title, fees' value={form.closing_costs} onChange={e => set('closing_costs', e.target.value)} /></div>
                <div><label style={lbl}>Financing (points + constr. interest)</label><input className='input' type='number' placeholder='points + interest' value={form.financing_costs} onChange={e => set('financing_costs', e.target.value)} /></div>
              </div>
              <div style={{ marginTop: '14px', padding: '12px 14px', background: 'var(--bg3)', borderRadius: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Project Cost</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>{fm(totalProjectCost)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)' }}>your true cost basis</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Cash Invested (suggested)</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--blue)', marginTop: '2px' }}>{suggestedCash != null ? fm(suggestedCash) : '—'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)' }}>cost − {fm(loanTotal)} borrowed</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Created Equity</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: createdEquity == null ? 'var(--text3)' : createdEquity >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '2px' }}>{createdEquity != null ? fm(createdEquity) : '—'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)' }}>market value − cost</div>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '8px', lineHeight: 1.5 }}>
                {isBuild
                  ? 'For a build: Land + Construction + Soft + Closing + Financing = your basis. What the loan covers is debt; the rest is your cash. Set Market Value above to the as-built value to see the equity you created.'
                  : 'For a purchase: Purchase Price (above) + Rehab + Closing + Financing = your basis.'}
              </div>
            </div>
            <div style={card}>
              <div style={secTtl}>Notes</div>
              <textarea className='input' style={{ resize: 'vertical' }} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </>
        )}

        {tab === 'tax' && (
          <div style={card}>
            <div style={secTtl}>County Appraiser Info</div>
            <div style={{ ...g3, marginBottom: '12px' }}>
              <div><label style={lbl}>County</label><input className='input' placeholder='Seminole' value={form.county} onChange={e => set('county', e.target.value)} /></div>
              <div><label style={lbl}>Parcel ID</label><input className='input' placeholder='12-34-56-789' value={form.parcel_id} onChange={e => set('parcel_id', e.target.value)} /></div>
              <div><label style={lbl}>Alt Key</label><input className='input' placeholder='1234567' value={form.alt_key} onChange={e => set('alt_key', e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: '12px' }}><label style={lbl}>Property Description</label><input className='input' placeholder='LOT 4 BLK 2 EXAMPLE SUB' value={form.prop_description} onChange={e => set('prop_description', e.target.value)} /></div>
            <div style={g3}>
              <div><label style={lbl}>Assessed Value</label><input className='input' type='number' value={form.assessed_value} onChange={e => set('assessed_value', e.target.value)} /></div>
              <div><label style={lbl}>Annual Tax</label><input className='input' type='number' value={form.annual_tax} onChange={e => set('annual_tax', e.target.value)} /></div>
              <div><label style={lbl}>Tax Due Date</label><input className='input' type='date' value={form.tax_due_date} onChange={e => set('tax_due_date', e.target.value)} /></div>
            </div>
          </div>
        )}

        {tab === 'insurance' && (
          <div style={card}>
            <div style={secTtl}>Insurance Details</div>
            <div style={{ ...g3, marginBottom: '12px' }}>
              <div><label style={lbl}>Insurance Company</label><input className='input' placeholder='Citizens, Universal, etc.' value={form.insurance_company} onChange={e => set('insurance_company', e.target.value)} /></div>
              <div><label style={lbl}>Policy Number</label><input className='input' value={form.insurance_policy} onChange={e => set('insurance_policy', e.target.value)} /></div>
              <div><label style={lbl}>Annual Premium</label><input className='input' type='number' value={form.insurance_premium} onChange={e => set('insurance_premium', e.target.value)} /></div>
            </div>
            <div style={g3}>
              <div><label style={lbl}>Policy Start</label><input className='input' type='date' value={form.insurance_start} onChange={e => set('insurance_start', e.target.value)} /></div>
              <div><label style={lbl}>Policy Expires</label><input className='input' type='date' value={form.insurance_expires} onChange={e => set('insurance_expires', e.target.value)} /></div>
              <div><label style={lbl}>Agent Name</label><input className='input' value={form.insurance_agent} onChange={e => set('insurance_agent', e.target.value)} /></div>
            </div>
          </div>
        )}

        {tab === 'utilities' && (
          <>
            <div style={card}>
              <div style={secTtl}>Utility Companies</div>
              <div style={{ ...g3, marginBottom: '12px' }}>
                <div><label style={lbl}>Electric</label><input className='input' placeholder='Duke Energy' value={form.utility_electric} onChange={e => set('utility_electric', e.target.value)} /></div>
                <div><label style={lbl}>Water</label><input className='input' placeholder='County Water' value={form.utility_water} onChange={e => set('utility_water', e.target.value)} /></div>
                <div><label style={lbl}>Gas</label><input className='input' placeholder='TECO Peoples Gas' value={form.utility_gas} onChange={e => set('utility_gas', e.target.value)} /></div>
              </div>
              <div style={g3}>
                <div><label style={lbl}>Trash</label><input className='input' placeholder='Waste Pro' value={form.utility_trash} onChange={e => set('utility_trash', e.target.value)} /></div>
                <div><label style={lbl}>Internet</label><input className='input' placeholder='Spectrum, AT&T' value={form.utility_internet} onChange={e => set('utility_internet', e.target.value)} /></div>
                <div><label style={lbl}>Cable</label><input className='input' placeholder='Spectrum' value={form.utility_cable} onChange={e => set('utility_cable', e.target.value)} /></div>
              </div>
            </div>
            <div style={card}>
              <div style={secTtl}>Schools</div>
              <div style={{ ...g2, marginBottom: '12px' }}>
                <div><label style={lbl}>School District</label><input className='input' placeholder='Seminole County Schools' value={form.school_district} onChange={e => set('school_district', e.target.value)} /></div>
                <div><label style={lbl}>Elementary School</label><input className='input' value={form.school_elementary} onChange={e => set('school_elementary', e.target.value)} /></div>
              </div>
              <div style={g2}>
                <div><label style={lbl}>Middle School</label><input className='input' value={form.school_middle} onChange={e => set('school_middle', e.target.value)} /></div>
                <div><label style={lbl}>High School</label><input className='input' value={form.school_high} onChange={e => set('school_high', e.target.value)} /></div>
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
                <div><label style={lbl}>HOA Name</label><input className='input' placeholder='Lakeside HOA' value={form.hoa_name} onChange={e => set('hoa_name', e.target.value)} /></div>
                <div><label style={lbl}>Monthly Fee</label><input className='input' type='number' placeholder='150' value={form.hoa_fee} onChange={e => set('hoa_fee', e.target.value)} /></div>
                <div><label style={lbl}>HOA Contact</label><input className='input' placeholder='Phone or email' value={form.hoa_contact} onChange={e => set('hoa_contact', e.target.value)} /></div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <a href={'/properties/' + params.id} className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </AppShell>
  )
}