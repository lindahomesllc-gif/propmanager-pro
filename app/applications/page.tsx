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
    </AppShell>
  )
}