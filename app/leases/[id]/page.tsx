'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function LeaseDetailPage({ params }) {
  const [lease, setLease] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

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
    const path = USER_ID + '/' + params.id + '/' + Date.now() + '.pdf'
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
    </AppShell>
  )
}