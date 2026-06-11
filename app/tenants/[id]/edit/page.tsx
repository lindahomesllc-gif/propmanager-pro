'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function EditTenantPage({ params }) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [units, setUnits] = useState<any[]>([])
  const [origUnitId, setOrigUnitId] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [leaseId, setLeaseId] = useState('')        // current lease being edited (blank = none yet)
  const [addLease, setAddLease] = useState(false)   // create a lease when none exists
  const [form, setForm] = useState({
    unit_id: '', unit_address: '', full_name: '', email: '', phone: '',
    move_in_date: '', move_out_date: '',
    status: 'active', portal_access: true,
    emergency_contact_name: '', emergency_contact_phone: '',
    notes: '',
    co_tenant_name: '', co_tenant_email: '', co_tenant_phone: '',
    minor_names: '',
    // lease & rent (current lease)
    rent_amount: '', security_deposit: '', start_date: '', end_date: '',
    due_day: '1', grace_period_days: '5', late_fee_amount: '50', late_fee_type: 'flat',
    lease_type: 'fixed', lease_status: 'executed',
    pet_deposit: '0', pet_policy: 'none', parking_spaces: '0', special_clauses: '',
  })

  useEffect(() => {
    supabase.from('tenants').select('*').eq('id', params.id).single()
      .then(async ({ data }) => {
        if (data) {
          setOrigUnitId(data.unit_id || '')
          setPropertyId(data.property_id || '')
          // pick the tenant's current lease: prefer an executed one, else the most recent
          const { data: leases } = await supabase.from('leases').select('*').eq('tenant_id', params.id).order('start_date', { ascending: false })
          const lease = (leases || []).find((l: any) => l.status === 'executed') || (leases || [])[0] || null

          setForm({
            unit_id: data.unit_id || '',
            unit_address: data.unit_address || '',
            full_name: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
            move_in_date: data.move_in_date || '',
            move_out_date: data.move_out_date || '',
            status: data.status || 'active',
            portal_access: data.portal_access ?? true,
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || '',
            notes: data.notes || '',
            co_tenant_name: data.co_tenant_name || '',
            co_tenant_email: data.co_tenant_email || '',
            co_tenant_phone: data.co_tenant_phone || '',
            minor_names: data.minor_names || '',
            rent_amount: lease?.rent_amount != null ? String(lease.rent_amount) : '',
            security_deposit: lease?.security_deposit != null ? String(lease.security_deposit) : '',
            start_date: lease?.start_date || '',
            end_date: lease?.end_date || '',
            due_day: lease?.due_day != null ? String(lease.due_day) : '1',
            grace_period_days: lease?.grace_period_days != null ? String(lease.grace_period_days) : '5',
            late_fee_amount: lease?.late_fee_amount != null ? String(lease.late_fee_amount) : '50',
            late_fee_type: lease?.late_fee_type || 'flat',
            lease_type: lease?.lease_type || 'fixed',
            lease_status: lease?.status || 'executed',
            pet_deposit: lease?.pet_deposit != null ? String(lease.pet_deposit) : '0',
            pet_policy: lease?.pet_policy || 'none',
            parking_spaces: lease?.parking_spaces != null ? String(lease.parking_spaces) : '0',
            special_clauses: lease?.special_clauses || '',
          })
          setLeaseId(lease?.id || '')
          setAddLease(!!lease)
          if (data.property_id) {
            supabase.from('units').select('id, label, kind').eq('property_id', data.property_id).order('label')
              .then(({ data: us }) => setUnits(us || []))
          }
        }
        setLoading(false)
      })
  }, [params.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.full_name) { setError('Name is required'); return }
    const wantLease = addLease && form.rent_amount
    if (wantLease && (!form.start_date || !form.end_date)) { setError('A lease needs both a start and end date.'); return }
    setSaving(true)
    const selUnit = units.find(u => u.id === form.unit_id)
    // property has units → label follows the chosen unit; otherwise keep legacy free-text
    const unitAddress = units.length > 0 ? (selUnit?.label || null) : (form.unit_address || null)
    const unitId = units.length > 0 ? (form.unit_id || null) : (origUnitId || null)
    const { error: err } = await supabase.from('tenants').update({
      unit_id: unitId,
      unit_address: unitAddress,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      move_in_date: form.move_in_date || null,
      move_out_date: form.move_out_date || null,
      status: form.status,
      portal_access: form.portal_access,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      notes: form.notes || null,
      co_tenant_name: form.co_tenant_name || null,
      co_tenant_email: form.co_tenant_email || null,
      co_tenant_phone: form.co_tenant_phone || null,
      minor_names: form.minor_names || null,
    }).eq('id', params.id)
    if (err) { setSaving(false); setError('Error: ' + err.message); return }

    // keep unit occupancy in sync when the assignment changed
    if (units.length > 0 && form.unit_id !== origUnitId) {
      if (origUnitId) await supabase.from('units').update({ status: 'vacant' }).eq('id', origUnitId)
      if (form.unit_id) await supabase.from('units').update({ status: 'occupied' }).eq('id', form.unit_id)
    }

    // save the lease alongside the tenant
    if (wantLease) {
      const leasePayload = {
        property_id: propertyId,
        unit_id: unitId,
        tenant_id: params.id,
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
      }
      const { error: lErr } = leaseId
        ? await supabase.from('leases').update(leasePayload).eq('id', leaseId)
        : await supabase.from('leases').insert(leasePayload)
      if (lErr) { setSaving(false); setError('Tenant saved, but the lease failed: ' + lErr.message); return }
    }

    setSaving(false)
    window.location.href = '/tenants/' + params.id
  }

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href={'/tenants/' + params.id} style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Back to Tenant</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>Edit Tenant</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={'/tenants/' + params.id} className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && <div style={{ background: '#3a1a1a', border: '0.5px solid #ff6b6b', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
        <div style={card}>
          <div style={secTtl}>Tenant Information</div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Full Name *</label><input className='input' value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
            <div><label style={lbl}>{units.length > 0 ? 'Unit / Room' : 'Unit Address'}</label>
              {units.length > 0 ? (
                <select className='input' value={form.unit_id} onChange={e => set('unit_id', e.target.value)}>
                  <option value=''>— Whole property —</option>
                  {units.map((u: any) => <option key={u.id} value={u.id}>{u.label}{u.kind === 'room' ? ' (room)' : ''}</option>)}
                </select>
              ) : (
                <input className='input' placeholder='e.g. 2515 Ridgewood Ave' value={form.unit_address} onChange={e => set('unit_address', e.target.value)} />
              )}
            </div>
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Email</label><input className='input' type='email' value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label style={lbl}>Phone</label><input className='input' value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div style={{ ...g2, marginBottom: '12px' }}>
            <div><label style={lbl}>Move In Date</label><input className='input' type='date' value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} /></div>
            <div><label style={lbl}>Move Out Date</label><input className='input' type='date' value={form.move_out_date} onChange={e => set('move_out_date', e.target.value)} /></div>
          </div>
          <div style={g2}>
            <div><label style={lbl}>Status</label>
              <select className='input' value={form.status} onChange={e => set('status', e.target.value)}>
                <option value='active'>Active</option>
                <option value='past'>Past</option>
                <option value='applicant'>Applicant</option>
              </select>
            </div>
            <div><label style={lbl}>Portal Access</label>
              <select className='input' value={form.portal_access ? 'true' : 'false'} onChange={e => set('portal_access', e.target.value === 'true')}>
                <option value='true'>Yes</option>
                <option value='false'>No</option>
              </select>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: addLease ? '14px' : '0' }}>
            <div style={secTtl as any}>Lease &amp; Rent {leaseId && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: 'var(--text3)' }}>· current lease</span>}</div>
            {!leaseId && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text2)', cursor: 'pointer' }}>
                <input type='checkbox' checked={addLease} onChange={e => setAddLease(e.target.checked)} />
                Add a lease
              </label>
            )}
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
              {leaseId && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '10px' }}>Editing this tenant&apos;s current lease. For renewals or a tenant with multiple leases, use the Leases page.</div>}
            </>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>No lease on file for this tenant. Check &ldquo;Add a lease&rdquo; to create one here.</div>
          )}
        </div>

        <div style={card}>
          <div style={secTtl}>Emergency Contact</div>
          <div style={g2}>
            <div><label style={lbl}>Name</label><input className='input' value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></div>
            <div><label style={lbl}>Phone</label><input className='input' value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></div>
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
          <div style={secTtl}>Notes</div>
          <textarea className='input' style={{ resize: 'vertical' }} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <a href={'/tenants/' + params.id} className='btn btn-ghost'>Cancel</a>
          <button className='btn btn-primary' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </AppShell>
  )
}
