'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function TenantDetailPage({ params }) {
  const [tenant, setTenant] = useState(null)
  const [leases, setLeases] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    Promise.all([
      supabase.from('tenants').select('*, properties(address, city, state)').eq('id', params.id).eq('user_id', USER_ID).single(),
      supabase.from('leases').select('id, rent_amount, start_date, end_date, status, pdf_url, security_deposit').eq('tenant_id', params.id).eq('user_id', USER_ID).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('tenant_id', params.id).eq('user_id', USER_ID).order('due_date', { ascending: false }).limit(10),
    ]).then(([t, l, p]) => {
      setTenant(t.data)
      setLeases(l.data || [])
      setPayments(p.data || [])
      setLoading(false)
    })
  }, [params.id])

  async function uploadDoc(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const path = USER_ID + '/tenants/' + params.id + '/' + Date.now() + '_' + file.name
    const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(path)
    const existingDocs = tenant.documents || []
    await supabase.from('tenants').update({ documents: [...existingDocs, urlData.publicUrl] }).eq('id', params.id).eq('user_id', USER_ID)
    setTenant(prev => ({ ...prev, documents: [...(prev.documents || []), urlData.publicUrl] }))
    setUploading(false)
  }

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>
  if (!tenant) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Tenant not found.</div></AppShell>

  const t = tenant
  const activeLease = leases.find(l => l.status === 'executed')
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0)
  const initials = t.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const statusColor = t.status === 'active' ? 'var(--green)' : 'var(--text3)'
  const statusBg = t.status === 'active' ? 'var(--green-bg)' : 'var(--bg3)'

  // Days until lease expires
  const daysUntilExpiry = activeLease?.end_date ? Math.ceil((new Date(activeLease.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
  const expiryColor = daysUntilExpiry !== null ? (daysUntilExpiry <= 30 ? 'var(--red)' : daysUntilExpiry <= 90 ? 'var(--amber)' : 'var(--green)') : 'var(--text3)'

  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const lbl = { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }
  const btnG = { background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const btnP = { background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }

  return (
    <AppShell>
      {/* Header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ padding: '10px 20px 0', display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text3)' }}>
          <a href='/tenants' style={{ color: 'var(--text3)', textDecoration: 'none' }}>← Tenants</a>
          {t.property_id && <><span>·</span><a href={'/properties/' + t.property_id} style={{ color: 'var(--text3)', textDecoration: 'none' }}>← Back to Property</a></>}
        </div>
        <div style={{ padding: '16px 20px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: 'var(--green)', flexShrink: 0, border: '2px solid var(--green)' }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{t.full_name}{t.co_tenant_name ? ' & ' + t.co_tenant_name : ''}</div>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: statusBg, color: statusColor, fontWeight: 700, textTransform: 'uppercase' }}>{t.status}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '3px' }}>{t.unit_address || t.properties?.address}{t.properties?.city ? ' · ' + t.properties.city + ', ' + t.properties.state : ''}</div>

          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <a href={'/payments?tenant_id=' + t.id} style={btnP}>+ Record Payment</a>
            <a href={'/tenants/' + t.id + '/edit'} style={btnG}>Edit</a>
          </div>
        </div>
        {/* Lease banner */}
        {activeLease && (
          <div style={{ margin: '0 20px 16px', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + expiryColor, borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div><div style={lbl}>Monthly Rent</div><div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>{fm(activeLease.rent_amount)}</div></div>
              <div><div style={lbl}>Lease Start</div><div style={{ ...val, fontSize: '12px' }}>{formatDate(activeLease.start_date)}</div></div>
              <div><div style={lbl}>Lease End</div><div style={{ ...val, fontSize: '12px', color: expiryColor }}>{formatDate(activeLease.end_date)}{daysUntilExpiry !== null ? ' (' + daysUntilExpiry + 'd)' : ''}</div></div>
              {activeLease.security_deposit && <div><div style={lbl}>Deposit</div><div style={{ ...val, fontSize: '12px' }}>{fm(activeLease.security_deposit)}</div></div>}
            </div>
            <a href={'/leases/' + activeLease.id} style={btnG}>View Lease</a>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Move In', value: formatDate(t.move_in_date) || '—', color: 'var(--text)' },
            { label: 'Move Out', value: t.move_out_date ? formatDate(t.move_out_date) : 'Current', color: 'var(--green)' },
            { label: 'Total Paid', value: fm(totalPaid), color: 'var(--green)' },
            { label: 'Payments', value: payments.length, color: 'var(--text)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={lbl}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }}>Contact Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  ['Email', t.email || '—'],
                  ['Phone', t.phone || '—'],
                  ['Date of Birth', t.date_of_birth ? formatDate(t.date_of_birth) : '—'],
                  ['Portal Access', t.portal_access ? 'Yes' : 'No'],
                  ['Emergency Contact', t.emergency_contact_name || '—'],
                  ['Emergency Phone', t.emergency_contact_phone || '—'],
                  ['Co-Tenant', t.co_tenant_name || '—'],
                  ['Co-Tenant Phone', t.co_tenant_phone || '—'],
                  ['Minors/Occupants', t.minor_names || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={val}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {t.notes && (
              <div style={card}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '8px' }}>Notes</div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>{t.notes}</div>
              </div>
            )}
          </div>
          <div>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)' }}>Recent Payments</div>
                <a href={'/payments'} style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>View All</a>
              </div>
              {payments.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)', padding: '10px 0' }}>No payments recorded.</div>
              ) : payments.slice(0, 5).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{formatDate(p.due_date)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{p.payment_method?.replace('_', ' ') || '—'} · {p.status}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: p.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>{fm(p.amount_paid)}</div>
                    {p.amount_paid !== p.amount_due && <div style={{ fontSize: '10px', color: 'var(--text3)' }}>of {fm(p.amount_due)}</div>}
                  </div>
                </div>
              ))}
              <a href='/payments' style={{ display: 'block', paddingTop: '10px', fontSize: '12px', color: 'var(--green)', textDecoration: 'none' }}>View all payments →</a>
            </div>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }}>Leases</div>
              {leases.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '12px' }}>No leases found.</div>
              ) : leases.map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{fm(l.rent_amount)}/mo</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{formatDate(l.start_date)} → {formatDate(l.end_date)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: l.status === 'executed' ? 'var(--green-bg)' : 'var(--bg3)', color: l.status === 'executed' ? 'var(--green)' : 'var(--text3)' }}>{l.status}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}><a href='/leases/new' style={btnG}>+ New Lease</a></div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)' }}>Documents</div>
            <button style={btnP} onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading...' : '⬆ Upload'}</button>
          </div>
          <input ref={fileRef} type='file' accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' style={{ display: 'none' }} onChange={uploadDoc} />
          {leases.filter(l => l.pdf_url).map((l, i) => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '0.5px solid var(--border)', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text)' }}>📋 Signed Lease</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{formatDate(l.start_date)} → {formatDate(l.end_date)}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href={l.pdf_url} target='_blank' style={btnG}>View</a>
                <a href={l.pdf_url} download style={btnG}>Download</a>
              </div>
            </div>
          ))}
          {(!t.documents || t.documents.length === 0) && leases.filter(l => l.pdf_url).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: '13px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
              No documents yet.
            </div>
          ) : (t.documents || []).map((url, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '0.5px solid var(--border)', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>📄 {decodeURIComponent(url.split('/').pop().split('_').slice(1).join('_')) || 'Document ' + (i + 1)}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href={url} target='_blank' style={btnG}>View</a>
                <a href={url} download style={btnG}>Download</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}