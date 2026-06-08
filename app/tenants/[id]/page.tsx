'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate } from '@/lib/supabase'

export default function TenantDetailPage({ params }) {
  const [tenant, setTenant] = useState(null)
  const [leases, setLeases] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [uploading, setUploading] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const fileRef = useRef(null)

  async function sendPortalLink() {
    if (!tenant?.email) { alert('This tenant has no email address on file. Add one via Edit before sending a portal link.'); return }
    if (!confirm('Send a portal login link to ' + tenant.full_name + ' (' + tenant.email + ')?\n\nThey will get an email to access the tenant portal.')) return
    setSendingLink(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: tenant.email,
      options: { emailRedirectTo: window.location.origin + '/portal/auth/callback' },
    })
    if (error) {
      const msg = /rate limit/i.test(error.message)
        ? 'A login link was sent to this tenant recently. Please wait a few minutes before requesting another.'
        : 'Could not send portal link: ' + error.message
      alert(msg); setSendingLink(false); return
    }
    if (!tenant.portal_access) {
      await supabase.from('tenants').update({ portal_access: true }).eq('id', params.id)
      setTenant(prev => ({ ...prev, portal_access: true }))
    }
    setSendingLink(false)
    alert('✅ Portal login link sent to ' + tenant.email + '\n\nThey can click the link in their email to access the tenant portal. The link expires in 1 hour.')
  }

  useEffect(() => {
    Promise.all([
      supabase.from('tenants').select('*, properties(address, city, state)').eq('id', params.id).single(),
      supabase.from('leases').select('id, rent_amount, start_date, end_date, status, pdf_url, security_deposit, due_day, late_fee_amount').eq('tenant_id', params.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('tenant_id', params.id).order('due_date', { ascending: false }),
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
    const { data: { user: _u } } = await supabase.auth.getUser()
    const path = (_u?.id || 'unknown') + '/tenants/' + params.id + '/' + Date.now() + '_' + file.name
    const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(path)
    const existingDocs = tenant.documents || []
    await supabase.from('tenants').update({ documents: [...existingDocs, urlData.publicUrl] }).eq('id', params.id)
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
  const daysUntilExpiry = activeLease?.end_date ? Math.ceil((new Date(activeLease.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
  const expiryColor = daysUntilExpiry !== null ? (daysUntilExpiry <= 30 ? 'var(--red)' : daysUntilExpiry <= 90 ? 'var(--amber)' : 'var(--green)') : 'var(--text3)'
  const lbl = { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const btnG = { background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const tabs = ['overview', 'payments', 'leases', 'documents']
  const tabLabels = { overview: 'Overview', payments: 'Payments', leases: 'Leases', documents: 'Documents' }

  return (
    <AppShell>
      <div style={{ background: 'var(--bg2)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ padding: '10px 20px 0', display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text3)' }}>
          <a href='/tenants' style={{ color: 'var(--text3)', textDecoration: 'none' }}>← Tenants</a>
          {t.property_id && <><span>·</span><a href={'/properties/' + t.property_id} style={{ color: 'var(--text3)', textDecoration: 'none' }}>← Back to Property</a></>}
        </div>
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: statusBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: statusColor, flexShrink: 0, border: '2px solid ' + statusColor }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{t.full_name}{t.co_tenant_name ? ' & ' + t.co_tenant_name : ''}</div>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: statusBg, color: statusColor, fontWeight: 700, textTransform: 'uppercase' }}>{t.status}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '3px' }}>📍 {t.unit_address || t.properties?.address}{t.properties?.city ? ' · ' + t.properties.city + ', ' + t.properties.state : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <a href={'/payments?tenant_id=' + t.id} className='btn btn-primary'>+ Payment</a>
            <button onClick={sendPortalLink} disabled={sendingLink} style={{ ...btnG, cursor: sendingLink ? 'not-allowed' : 'pointer', opacity: sendingLink ? 0.6 : 1 }}>{sendingLink ? 'Sending…' : '✉ Send Portal Link'}</button>
            <a href={'/tenants/' + t.id + '/edit'} className='btn btn-ghost'>Edit</a>
          </div>
        </div>
        {activeLease && (
          <div style={{ margin: '12px 20px 0', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + expiryColor, borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div><div style={lbl}>Monthly Rent</div><div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>{fm(activeLease.rent_amount)}</div></div>
            <div><div style={lbl}>Lease Start</div><div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{formatDate(activeLease.start_date)}</div></div>
            <div><div style={lbl}>Lease End</div><div style={{ fontSize: '13px', fontWeight: 500, color: expiryColor }}>{formatDate(activeLease.end_date)}{daysUntilExpiry !== null ? ' (' + daysUntilExpiry + 'd)' : ''}</div></div>
            {activeLease.security_deposit && <div><div style={lbl}>Deposit</div><div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{fm(activeLease.security_deposit)}</div></div>}
            <div style={{ marginLeft: 'auto' }}><a href={'/leases/' + activeLease.id} className='btn btn-ghost'>View Lease</a></div>
          </div>
        )}
        <div style={{ display: 'flex', marginTop: '12px', overflowX: 'auto' }}>
          {tabs.map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer', border: 'none', borderBottom: tab === tb ? '2px solid var(--green)' : '2px solid transparent', background: 'transparent', color: tab === tb ? 'var(--green)' : 'var(--text2)', fontWeight: tab === tb ? 600 : 400, whiteSpace: 'nowrap' }}>{tabLabels[tb]}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {tab === 'overview' && (
          <>
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
              <div style={card}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>👤 Contact Info</div>
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
              <div>
                {t.notes && (
                  <div style={card}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>📝 Notes</div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>{t.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'payments' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>💳 Payment History</div>
              <a href={'/payments?tenant_id=' + t.id} className='btn btn-primary'>+ Record Payment</a>
            </div>
            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)', fontSize: '13px' }}>No payments recorded yet.</div>
            ) : payments.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Due {formatDate(p.due_date)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{p.payment_method?.replace('_', ' ') || '—'}{p.paid_date ? ' · Paid ' + formatDate(p.paid_date) : ''}{p.notes ? ' · ' + p.notes : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: p.status === 'paid' ? 'var(--green)' : p.status === 'late' ? 'var(--red)' : 'var(--amber)' }}>{fm(p.amount_paid)}</div>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '20px', background: p.status === 'paid' ? 'var(--green-bg)' : p.status === 'late' ? 'var(--red-bg)' : 'var(--amber-bg)', color: p.status === 'paid' ? 'var(--green)' : p.status === 'late' ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'leases' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>📋 Lease History</div>
              <a href='/leases/new' className='btn btn-ghost'>+ New Lease</a>
            </div>
            {leases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)', fontSize: '13px' }}>No leases found.</div>
            ) : leases.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{fm(l.rent_amount)}/mo</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{formatDate(l.start_date)} → {formatDate(l.end_date)}</div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: l.status === 'executed' ? 'var(--green-bg)' : 'var(--bg3)', color: l.status === 'executed' ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>{l.status?.replace('_', ' ')}</span>
                    {l.security_deposit && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: 'var(--bg3)', color: 'var(--text3)' }}>Deposit {fm(l.security_deposit)}</span>}
                    {l.pdf_url && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 600 }}>📄 Signed</span>}
                  </div>
                </div>
                <a href={'/leases/' + l.id} className='btn btn-ghost'>View</a>
              </div>
            ))}
          </div>
        )}

        {tab === 'documents' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>📄 Documents</div>
              <button className='btn btn-primary' onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading...' : '⬆ Upload'}</button>
            </div>
            <input ref={fileRef} type='file' accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' style={{ display: 'none' }} onChange={uploadDoc} />
            {leases.filter(l => l.pdf_url).map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '0.5px solid var(--border)', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>📋 Signed Lease</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{formatDate(l.start_date)} → {formatDate(l.end_date)}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a href={l.pdf_url} target='_blank' className='btn btn-ghost'>View</a>
                  <a href={l.pdf_url} download className='btn btn-ghost'>Download</a>
                </div>
              </div>
            ))}
            {(!t.documents || t.documents.length === 0) && leases.filter(l => l.pdf_url).length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)', fontSize: '13px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                No documents yet.
              </div>
            )}
            {(t.documents || []).map((url, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '0.5px solid var(--border)', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>📄 {decodeURIComponent(url.split('/').pop().split('_').slice(1).join('_')) || 'Document ' + (i + 1)}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a href={url} target='_blank' className='btn btn-ghost'>View</a>
                  <a href={url} download className='btn btn-ghost'>Download</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}