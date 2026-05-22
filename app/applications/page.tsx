'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [tenants, setTenants] = useState([])
  const [showCoTenant, setShowCoTenant] = useState(null)
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('applications').select('*, properties(address)').eq('user_id', USER_ID).order('submitted_at', { ascending: false }),
      supabase.from('properties').select('id, address').eq('user_id', USER_ID),
      supabase.from('tenants').select('id, full_name, property_id').eq('user_id', USER_ID).eq('status', 'active'),
    ]).then(([a, p, t]) => {
      setApplications(a.data || [])
      setProperties(p.data || [])
      setTenants(t.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)

  const statusColor = (s) => ({
    received: 'var(--blue)',
    screening_initiated: '#A78BFA',
    screening_complete: 'var(--amber)',
    approved: 'var(--green)',
    denied: 'var(--red)',
    withdrawn: 'var(--text2)',
  }[s] || 'var(--text2)')

  const recColor = (r) => ({ approve: 'var(--green)', review: 'var(--amber)', decline: 'var(--red)' }[r] || 'var(--text2)')

  async function updateStatus(id, status) {
    await supabase.from('applications').update({ status, decided_at: new Date().toISOString() }).eq('id', id).eq('user_id', USER_ID)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function addAsCoTenant(a, tenantId) {
    const tenant = tenants.find(t => t.id === tenantId)
    if (!tenant) return
    const { error } = await supabase.from('tenants').update({
      co_tenant_name: a.applicant_name,
      co_tenant_email: a.email || null,
      co_tenant_phone: a.phone || null,
    }).eq('id', tenantId).eq('user_id', USER_ID)
    if (error) { alert('Error: ' + error.message); return }
    await supabase.from('applications').update({ status: 'approved' }).eq('id', a.id)
    setShowCoTenant(null)
    alert(a.applicant_name + ' added as co-tenant to ' + tenant.full_name + '!')
  }

  async function convertToTenant(a) {
    if (!confirm('Convert ' + a.applicant_name + ' to an active tenant?')) return
    const docs = a.screening_report_url ? [a.screening_report_url] : []
    const { data: tenant, error } = await supabase.from('tenants').insert({
      user_id: USER_ID,
      property_id: a.property_id,
      full_name: a.applicant_name,
      email: a.email || null,
      phone: a.phone || null,
      move_in_date: a.desired_move_in || null,
      status: 'active',
      portal_access: false,
      documents: docs,
    }).select().single()
    if (error) { alert('Error: ' + error.message); return }
    await supabase.from('applications').update({ status: 'converted', tenant_id: tenant.id }).eq('id', a.id).eq('user_id', USER_ID)
    setApplications(prev => prev.map(x => x.id === a.id ? { ...x, status: 'converted', tenant_id: tenant.id } : x))
    alert(a.applicant_name + ' has been added as a tenant! Screening report copied to their documents.')
  }

  const sel = { padding: '6px 10px', fontSize: '12px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Applications</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={sel}>
            <option value='all'>All Applications</option>
            <option value='received'>Received</option>
            <option value='screening_initiated'>Screening</option>
            <option value='screening_complete'>Screening Complete</option>
            <option value='approved'>Approved</option>
            <option value='denied'>Denied</option>
            <option value='withdrawn'>Withdrawn</option>
          </select>
          <a href='/applications/new' style={{ background: 'var(--green)', color: 'var(--bg)', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>+ New Application</a>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '📋 Total', value: applications.length, color: 'var(--text)', f: 'all' },
          { label: '⏳ Pending', value: applications.filter(a => a.status === 'received' || a.status === 'screening_initiated' || a.status === 'screening_complete').length, color: 'var(--amber)', f: 'received' },
          { label: '✅ Approved', value: applications.filter(a => a.status === 'approved' || a.status === 'converted').length, color: 'var(--green)', f: 'approved' },
          { label: '❌ Denied', value: applications.filter(a => a.status === 'denied').length, color: 'var(--red)', f: 'denied' },
        ].map((mc, i) => (
          <button key={mc.label} onClick={() => setFilter(filter === mc.f ? 'all' : mc.f)} style={{ padding: '14px 20px', background: filter === mc.f ? mc.color + '15' : 'var(--bg2)', border: 'none', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: applications.length, color: 'var(--text)' },
            { label: 'Received', value: applications.filter(a => a.status === 'received').length, color: 'var(--blue)' },
            { label: 'In Screening', value: applications.filter(a => a.status === 'screening_initiated' || a.status === 'screening_complete').length, color: '#A78BFA' },
            { label: 'Approved', value: applications.filter(a => a.status === 'approved').length, color: 'var(--green)' },
            { label: 'Denied', value: applications.filter(a => a.status === 'denied').length, color: 'var(--red)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>No applications yet</div>
            <a href='/applications/new' style={{ background: 'var(--green)', color: 'var(--bg)', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Application</a>
          </div>
        )}
        {!loading && filtered.map(a => (
          <div key={a.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + statusColor(a.status), borderRadius: '10px', padding: '16px 20px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{a.applicant_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{a.email} {a.phone ? '· ' + a.phone : ''}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{a.properties?.address} · Applied {formatDate(a.submitted_at)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: statusColor(a.status) + '22', color: statusColor(a.status), fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{a.status?.replace(/_/g, ' ')}</span>
                {a.ai_recommendation && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: recColor(a.ai_recommendation) + '22', color: recColor(a.ai_recommendation), fontWeight: 600, textTransform: 'uppercase' }}>AI: {a.ai_recommendation}</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                ['Income', a.monthly_income ? fm(a.monthly_income) + '/mo' : '—'],
                ['Credit Score', a.credit_score || '—'],
                ['Move In', a.desired_move_in ? formatDate(a.desired_move_in) : '—'],
                ['Score', a.overall_score ? a.overall_score + '/100' : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '1px', fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
            {(a.status === 'approved' || a.status === 'converted') && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {a.status === 'approved' && <button onClick={() => convertToTenant(a)} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>👤 Convert to Tenant</button>}
                <button onClick={() => setShowCoTenant(showCoTenant === a.id ? null : a.id)} style={{ background: 'var(--blue-bg)', color: 'var(--blue)', border: '0.5px solid var(--blue)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>👥 Add as Co-Tenant</button>
                {a.status === 'converted' && a.tenant_id && <a href={'/tenants/' + a.tenant_id} style={{ background: 'transparent', color: 'var(--green)', border: '0.5px solid var(--green)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>View Tenant →</a>}
                {showCoTenant === a.id && (
                  <div style={{ marginTop: '8px', background: 'var(--bg3)', borderRadius: '8px', padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Add to:</span>
                    {tenants.map(t => (
                      <button key={t.id} onClick={() => addAsCoTenant(a, t.id)} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>{t.full_name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {a.status === 'received' || a.status === 'screening_complete' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => updateStatus(a.id, 'approved')} style={{ background: '#4ADE9A22', color: 'var(--green)', border: '0.5px solid #4ADE9A44', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>✓ Approve</button>
                <button onClick={() => updateStatus(a.id, 'denied')} style={{ background: '#F8717122', color: 'var(--red)', border: '0.5px solid #F8717144', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>✗ Deny</button>
                <button onClick={() => updateStatus(a.id, 'screening_initiated')} style={{ background: '#A78BFA22', color: '#A78BFA', border: '0.5px solid #A78BFA44', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Run Screening</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </AppShell>
  )
}