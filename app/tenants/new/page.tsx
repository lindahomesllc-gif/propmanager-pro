'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function NewTenantPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [addLease, setAddLease] = useState(true)
  const [form, setForm] = useState({
    property_id: '', unit_id: '', full_name: '', email: '', phone: '', move_in_date: '', notes: '',
    // co-tenant / occupants
    co_tenant_name: '', co_tenant_phone: '', co_tenant_email: '', minor_names: '',
    // lease & rent
    rent_amount: '', security_deposit: '', start_date: '', end_date: '',
    due_day: '1', grace_period_days: '5', late_fee_amount: '50', late_fee_type: 'flat',
    lease_type: 'fixed', lease_status: 'executed',
    pet_deposit: '0', pet_policy: 'none', parking_spaces: '0', special_clauses: '',
  })

  useEffect(() => {
    supabase.from('properties').select('id, address').then(({ data }) => {
      if (Array.isArray(data)) setProperties(data)
    })
    const sp = new URLSearchParams(window.location.search)
    const pid = sp.get('property') || ''
    const uid = sp.get('unit') || ''
    if (pid) setForm(f => ({ ...f, property_id: pid, unit_id: uid }))
  }, [])

  // load the chosen property's units (if any)
  useEffect(() => {
    if (!form.property_id) { setUnits([]); return }
    supabase.from('units').select('id, label, kind, market_rent').eq('property_id', form.property_id).order('label')
      .then(({ data }) => setUnits(data || []))
  }, [form.property_id])

  // prefill rent from the chosen unit's market rent (only if rent still blank)
  useEffect(() => {
    if (!form.unit_id) return
    const u = units.find(x => x.id === form.unit_id)
    if (u && u.market_rent && !form.rent_amount) setForm(f => ({ ...f, rent_amount: String(u.market_rent) }))
  }, [form.unit_id, units])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.full_name) { setError('Name is required'); return }
    if (!form.property_id) { setError('Please select a property'); return }
    if (addLease) {
      if (!form.rent_amount) { setError('Enter the monthly rent — or uncheck “Create a lease now”.'); return }
      if (!form.start_date || !form.end_date) { setError('A lease needs both a start and end date — or uncheck “Create a lease now”.'); return }
    }
    setSaving(true)
    const { data: tenant, error: err } = await supabase.from('tenants').insert({
      property_id: form.property_id,
      unit_id: form.unit_id || null,
      unit_address: units.find(u => u.id === form.unit_id)?.label || null,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      move_in_date: form.move_in_date || null,
      status: 'active',
      portal_access: true,
      notes: form.notes || null,
      co_tenant_name: form.co_tenant_name || null,
      co_tenant_phone: form.co_tenant_phone || null,
      co_tenant_email: form.co_tenant_email || null,
      minor_names: form.minor_names || null,
    }).select('id').single()
    if (err || !tenant) { setError(err?.message || 'Error saving tenant. Please try again.'); setSaving(false); return }

    if (form.unit_id) await supabase.from('units').update({ status: 'occupied' }).eq('id', form.unit_id)

    // create the lease in the same action when rent terms were filled in
    if (addLease && form.rent_amount) {
      const { error: lErr } = await supabase.from('leases').insert({
        property_id: form.property_id,
        unit_id: form.unit_id || null,
        tenant_id: tenant.id,
        rent_amount: parseFloat(form.rent_amount),
        security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
        pet_deposit: parseFloat(form.pet_deposit) || 0,
        start_date: form.start_date,
        end_date: form.end_date,
        due_day: parseInt(form.due_day) || 1,
        grace_period_days: parseInt(form.grace_period_days) || 0,
        late_fee_amount: parseFloat(form.late_fee_amount) || 0,
        late_fee_type: form.late_fee_type,
        lease_type: form.lease_type,
        pet_policy: form.pet_policy,
        parking_spaces: parseInt(form.parking_spaces) || 0,
        special_clauses: form.special_clauses || null,
        status: form.lease_status,
      })
      if (lErr) { setError('Tenant saved, but the lease failed: ' + lErr.message + '. You can add it from the tenant page.'); setSaving(false); return }
    }
    window.location.href = '/tenants/' + tenant.id
  }

  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card: any = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3: any = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const secTtl: any = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Add New Tenant</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/tenants" className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Tenant'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}

        <div style={card}>
          <div style={secTtl}>Assign to Property</div>
          <label style={lbl}>Property *</label>
          <select className='input' value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value, unit_id: '' }))}>
            <option value="">Select a property...</option>
            {properties.map((p: any) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          {properties.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '6px' }}>Loading properties...</div>}
          {units.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <label style={lbl}>Unit / Room</label>
              <select className='input' value={form.unit_id} onChange={e => set('unit_id', e.target.value)}>
                <option value="">— Whole property —</option>
                {units.map((u: any) => <option key={u.id} value={u.id}>{u.label}{u.kind === 'room' ? ' (room)' : ''}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={card}>
          <div style={secTtl}>Tenant Information</div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Full Name *</label>
            <input className='input' placeholder="John Smith" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Email</label><input className='input' type="email" placeholder="john@email.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label style={lbl}>Phone</label><input className='input' placeholder="407-555-0100" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div>
            <label style={lbl}>Move In Date</label>
            <input className='input' type="date" value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
          </div>
        </div>

        <div style={card}>
          <div style={secTtl}>Co-Tenant / Occupants</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Co-Tenant Name</label><input className='input' placeholder='Full name' value={form.co_tenant_name} onChange={e => set('co_tenant_name', e.target.value)} /></div>
            <div><label style={lbl}>Co-Tenant Phone</label><input className='input' placeholder='Phone' value={form.co_tenant_phone} onChange={e => set('co_tenant_phone', e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: '12px' }}><label style={lbl}>Co-Tenant Email</label><input className='input' placeholder='Email' value={form.co_tenant_email} onChange={e => set('co_tenant_email', e.target.value)} /></div>
          <div><label style={lbl}>Minors / Other Occupants</label><input className='input' placeholder='e.g. John Jr. (age 8), Sarah (age 5)' value={form.minor_names} onChange={e => set('minor_names', e.target.value)} /></div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: addLease ? '14px' : '0' }}>
            <div style={secTtl as any}>Lease &amp; Rent</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text2)', cursor: 'pointer' }}>
              <input type='checkbox' checked={addLease} onChange={e => setAddLease(e.target.checked)} />
              Create a lease now
            </label>
          </div>
          {addLease ? (
            <>
              <div style={{ ...g2, marginBottom: '12px' }}>
                <div><label style={lbl}>Monthly Rent</label><input className='input' type='number' placeholder='1500' value={form.rent_amount} onChange={e => set('rent_amount', e.target.value)} /></div>
                <div><label style={lbl}>Security Deposit</label><input className='input' type='number' placeholder='1500' value={form.security_deposit} onChange={e => set('security_deposit', e.target.value)} /></div>
              </div>
              <div style={{ ...g2, marginBottom: '12px' }}>
                <div><label style={lbl}>Start Date</label><input className='input' type='date' value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
                <div><label style={lbl}>End Date</label><input className='input' type='date' value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
              </div>
              <div style={{ ...g3, marginBottom: '12px' }}>
                <div><label style={lbl}>Due Day</label><input className='input' type='number' min='1' max='28' placeholder='1' value={form.due_day} onChange={e => set('due_day', e.target.value)} /></div>
                <div><label style={lbl}>Grace (days)</label><input className='input' type='number' placeholder='5' value={form.grace_period_days} onChange={e => set('grace_period_days', e.target.value)} /></div>
                <div><label style={lbl}>Late Fee</label><input className='input' type='number' placeholder='50' value={form.late_fee_amount} onChange={e => set('late_fee_amount', e.target.value)} /></div>
              </div>
              <div style={{ ...g3, marginBottom: '12px' }}>
                <div><label style={lbl}>Late Fee Type</label>
                  <select className='input' value={form.late_fee_type} onChange={e => set('late_fee_type', e.target.value)}>
                    <option value='flat'>Flat Amount</option>
                    <option value='percent'>Percentage</option>
                  </select>
                </div>
                <div><label style={lbl}>Lease Type</label>
                  <select className='input' value={form.lease_type} onChange={e => set('lease_type', e.target.value)}>
                    <option value='fixed'>Fixed Term</option>
                    <option value='month_to_month'>Month to Month</option>
                  </select>
                </div>
                <div><label style={lbl}>Status</label>
                  <select className='input' value={form.lease_status} onChange={e => set('lease_status', e.target.value)}>
                    <option value='draft'>Draft</option>
                    <option value='sent'>Sent</option>
                    <option value='executed'>Executed</option>
                  </select>
                </div>
              </div>
              <div style={{ ...g3 }}>
                <div><label style={lbl}>Pet Deposit</label><input className='input' type='number' placeholder='0' value={form.pet_deposit} onChange={e => set('pet_deposit', e.target.value)} /></div>
                <div><label style={lbl}>Pet Policy</label>
                  <select className='input' value={form.pet_policy} onChange={e => set('pet_policy', e.target.value)}>
                    <option value='none'>No Pets</option>
                    <option value='allowed'>Pets Allowed</option>
                    <option value='case_by_case'>Case by Case</option>
                  </select>
                </div>
                <div><label style={lbl}>Parking Spaces</label><input className='input' type='number' placeholder='0' value={form.parking_spaces} onChange={e => set('parking_spaces', e.target.value)} /></div>
              </div>
              <div style={{ marginTop: '12px' }}><label style={lbl}>Special Clauses</label><textarea className='input' style={{ resize: 'vertical' }} rows={2} placeholder='Any special terms or clauses...' value={form.special_clauses} onChange={e => set('special_clauses', e.target.value)} /></div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>No lease will be created — just the tenant record. You can add a lease later from the tenant page (e.g. for an applicant who hasn&apos;t signed yet).</div>
          )}
        </div>

        <div style={card}>
          <div style={secTtl}>Notes</div>
          <textarea className='input' style={{ resize: 'vertical' }} rows={3} placeholder="Any notes about this tenant..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href="/tenants" className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : '+ Save Tenant'}</button>
        </div>
      </div>
    </AppShell>
  )
}
