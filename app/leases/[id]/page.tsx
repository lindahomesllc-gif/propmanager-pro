'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate } from '@/lib/supabase'

export default function LeaseDetailPage({ params }) {
  const [lease, setLease] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)
  const [showRenew, setShowRenew] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [renewForm, setRenewForm] = useState({ start_date: '', end_date: '', rent_amount: '', security_deposit: '' })

  useEffect(() => {
    supabase.from('leases').select('*, properties(address, city, state), tenants(full_name, email, phone)')
      .eq('id', params.id).single()
      .then(({ data }) => { setLease(data); setLoading(false) })
  }, [params.id])

  async function uploadPDF(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setUploadError('Please upload a PDF file'); return }
    setUploading(true)
    setUploadError('')
    const { data: { user: _u } } = await supabase.auth.getUser()
    const path = (_u?.id || 'unknown') + '/' + params.id + '/' + Date.now() + '.pdf'
    const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
    if (upErr) { setUploadError('Upload failed: ' + upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(path)
    const { error: updateErr } = await supabase.from('leases').update({
      pdf_url: urlData.publicUrl,
      status: 'executed',
    }).eq('id', params.id)
    if (updateErr) { setUploadError('Error saving: ' + updateErr.message); setUploading(false); return }
    setLease(l => ({ ...l, pdf_url: urlData.publicUrl, status: 'executed' }))
    setUploading(false)
  }

  function addToDate(dateStr, days, months) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    if (days) d.setDate(d.getDate() + days)
    if (months) d.setMonth(d.getMonth() + months)
    return d.toISOString().split('T')[0]
  }
  function openRenew() {
    const start = addToDate(lease.end_date, 1, 0) || new Date().toISOString().split('T')[0]
    const end = addToDate(start, 0, 12)
    setRenewForm({ start_date: start, end_date: end, rent_amount: String(lease.rent_amount || ''), security_deposit: String(lease.security_deposit || '') })
    setShowRenew(true)
  }
  async function doRenew() {
    if (!renewForm.start_date || !renewForm.end_date || !renewForm.rent_amount) { alert('Start date, end date, and rent are required.'); return }
    setRenewing(true)
    const l0 = lease
    // clone the lease into a new term; the cron continues charges at the new rent
    const { data: created, error: insErr } = await supabase.from('leases').insert({
      property_id: l0.property_id,
      unit_id: l0.unit_id || null,
      tenant_id: l0.tenant_id,
      rent_amount: parseFloat(renewForm.rent_amount),
      security_deposit: renewForm.security_deposit ? parseFloat(renewForm.security_deposit) : null,
      pet_deposit: l0.pet_deposit || 0,
      start_date: renewForm.start_date,
      end_date: renewForm.end_date,
      due_day: l0.due_day,
      grace_period_days: l0.grace_period_days,
      late_fee_amount: l0.late_fee_amount,
      late_fee_type: l0.late_fee_type,
      lease_type: l0.lease_type,
      pet_policy: l0.pet_policy,
      parking_spaces: l0.parking_spaces,
      special_clauses: l0.special_clauses,
      status: 'executed',
    }).select('id').single()
    if (insErr) { setRenewing(false); alert('Error creating renewal: ' + insErr.message); return }
    // expire the old term so charges stop and the history reads cleanly
    await supabase.from('leases').update({ status: 'expired' }).eq('id', l0.id)
    setRenewing(false)
    window.location.href = '/leases/' + created.id
  }

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>
  if (!lease) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Lease not found.</div></AppShell>

  const l = lease
  const statusColor = { executed: 'var(--green)', draft: 'var(--text2)', sent: 'var(--blue)', tenant_signed: 'var(--amber)', expired: 'var(--red)', terminated: 'var(--red)' }[l.status] || 'var(--text2)'
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }
  const lbl = { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }
  const btnB = { background: '#60A5FA22', color: 'var(--blue)', border: '0.5px solid #60A5FA44', borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href='/leases' style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Leases</a>
        {l.tenant_id && <a href={'/tenants/' + l.tenant_id} style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none', marginLeft: '12px' }}>← Back to Tenant</a>}
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>{l.tenants?.full_name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{l.properties?.address}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: statusColor + '22', color: statusColor, fontWeight: 600, textTransform: 'uppercase' }}>{l.status.replace(/_/g, ' ')}</span>
          {l.status === 'executed' && <button onClick={openRenew} className='btn btn-ghost'>♻ Renew</button>}
          <a href={'/leases/' + l.id + '/edit'} className='btn btn-ghost'>Edit</a>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Monthly Rent', value: fm(l.rent_amount), color: 'var(--green)' },
            { label: 'Security Deposit', value: fm(l.security_deposit), color: 'var(--text)' },
            { label: 'Late Fee', value: fm(l.late_fee_amount), color: 'var(--amber)' },
            { label: 'Due Day', value: 'Day ' + l.due_day, color: 'var(--text)' },
            { label: 'Grace Period', value: l.grace_period_days + ' days', color: 'var(--text)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={lbl}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        <div style={{ ...card, border: '0.5px solid rgba(96,165,250,0.3)', background: 'var(--bg3)' }}>
          <div style={secTtl}>Signed Lease Document</div>
          {l.pdf_url ? (
            <div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--green)' }}>✓ Signed lease uploaded</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href={l.pdf_url} target='_blank' className='btn btn-primary'>📄 View PDF</a>
                <a href={l.pdf_url} download className='btn btn-ghost'>⬇ Download</a>
                <button onClick={() => fileRef.current?.click()} className='btn btn-ghost'>↑ Replace PDF</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '12px' }}>No signed lease uploaded yet. Complete signing in Authentisign, then upload the signed PDF here.</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a href='https://www.authentisign.com' target='_blank' style={btnB}>✍ Open Authentisign</a>
                <button onClick={() => fileRef.current?.click()} className='btn btn-primary' disabled={uploading}>{uploading ? 'Uploading...' : '⬆ Upload Signed PDF'}</button>
              </div>
            </div>
          )}
          {uploadError && <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '8px' }}>{uploadError}</div>}
          <input ref={fileRef} type='file' accept='application/pdf' style={{ display: 'none' }} onChange={uploadPDF} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={card}>
            <div style={secTtl}>Lease Terms</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                ['Start Date', formatDate(l.start_date)],
                ['End Date', formatDate(l.end_date)],
                ['Lease Type', l.lease_type || '—'],
                ['Pet Policy', l.pet_policy || '—'],
                ['Parking', l.parking_spaces + ' space(s)'],
                ['Pet Deposit', fm(l.pet_deposit)],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={lbl}>{k}</div>
                  <div style={{ ...val, textTransform: 'capitalize' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={secTtl}>Tenant Info</div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{l.tenants?.full_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>{l.tenants?.email}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{l.tenants?.phone}</div>
            </div>
            <div style={secTtl}>Property</div>
            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{l.properties?.address}</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{l.properties?.city}, {l.properties?.state}</div>
          </div>
        </div>

        {l.special_clauses && (
          <div style={card}>
            <div style={secTtl}>Special Clauses</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>{l.special_clauses}</div>
          </div>
        )}
      </div>

      {showRenew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowRenew(false)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '440px', maxWidth: '92vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>Renew Lease</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', lineHeight: 1.5 }}>Creates a new lease term for {l.tenants?.full_name} and marks the current one <strong>Expired</strong>. Monthly rent charges continue automatically at the new amount — no double-billing.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={{ ...lbl, display: 'block', marginBottom: '4px' }}>New Start</label><input className='input' type='date' value={renewForm.start_date} onChange={e => setRenewForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><label style={{ ...lbl, display: 'block', marginBottom: '4px' }}>New End</label><input className='input' type='date' value={renewForm.end_date} onChange={e => setRenewForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div><label style={{ ...lbl, display: 'block', marginBottom: '4px' }}>New Monthly Rent</label><input className='input' type='number' value={renewForm.rent_amount} onChange={e => setRenewForm(f => ({ ...f, rent_amount: e.target.value }))} /></div>
              <div><label style={{ ...lbl, display: 'block', marginBottom: '4px' }}>Security Deposit</label><input className='input' type='number' value={renewForm.security_deposit} onChange={e => setRenewForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRenew(false)} className='btn btn-ghost'>Cancel</button>
              <button onClick={doRenew} disabled={renewing} className='btn btn-primary'>{renewing ? 'Renewing…' : '♻ Create Renewal'}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}