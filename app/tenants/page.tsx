'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('tenants').select('*, properties(address)').eq('user_id', USER_ID).order('full_name')
      .then(({ data }) => { setTenants(data || []); setLoading(false) })
  }, [])

  const [sendingId, setSendingId] = useState(null)

  async function deleteTenant(id, name) {
    if (!confirm('Delete ' + name + '? This cannot be undone.')) return
    const { error } = await supabase.from('tenants').delete().eq('id', id).eq('user_id', USER_ID)
    if (error) { alert('Error: ' + error.message); return }
    setTenants(prev => prev.filter(t => t.id !== id))
  }

  async function sendPortalLink(tenant) {
    if (!tenant.email) { alert('This tenant has no email address on file. Add one before sending a portal link.'); return }
    setSendingId(tenant.id)
    const { error } = await supabase.auth.signInWithOtp({
      email: tenant.email,
      options: { emailRedirectTo: window.location.origin + '/portal/auth/callback' },
    })
    if (!error && !tenant.portal_access) {
      await supabase.from('tenants').update({ portal_access: true }).eq('id', tenant.id).eq('user_id', USER_ID)
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, portal_access: true } : t))
    }
    setSendingId(null)
    if (error) {
      const msg = /rate limit/i.test(error.message)
        ? 'A login link was sent to this tenant recently. Please wait a few minutes before requesting another.'
        : 'Could not send portal link: ' + error.message
      alert(msg); return
    }
    alert('✅ Portal login link sent to ' + tenant.email + '\n\nThe link expires in 1 hour.')
  }

  const active = tenants.filter(t => t.status === 'active')
  const past = tenants.filter(t => t.status === 'past')

  const filtered = tenants.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter
    const matchSearch = !search || t.full_name?.toLowerCase().includes(search.toLowerCase()) || t.co_tenant_name?.toLowerCase().includes(search.toLowerCase()) || t.unit_address?.toLowerCase().includes(search.toLowerCase()) || t.properties?.address?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const statusColor = (s) => ({ active: 'var(--green)', past: 'var(--text3)', applicant: 'var(--amber)' }[s] || 'var(--text3)')
  const statusBg = (s) => ({ active: 'var(--green-bg)', past: 'var(--bg3)', applicant: 'var(--amber-bg)' }[s] || 'var(--bg3)')
  const chipClass = (s) => ({ active: 'chip-g', past: 'chip-x', applicant: 'chip-a' }[s] || 'chip-x')

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Tenants</div>
        <a href='/tenants/new' className='btn btn-primary'>+ Add Tenant</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '✅ Active', value: active.length, color: 'var(--green)', f: 'active' },
          { label: '👥 Total', value: tenants.length, color: 'var(--text)', f: 'all' },
          { label: '📦 Past', value: past.length, color: 'var(--text3)', f: 'past' },
        ].map((mc, i) => (
          <button key={mc.label} onClick={() => setFilter(filter === mc.f ? 'all' : mc.f)} style={{ padding: '14px 20px', background: filter === mc.f ? mc.color + '15' : 'var(--bg2)', border: 'none', borderRight: i < 2 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='🔍 Search by name, address...' className='input' />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '16px' }}>{search ? 'No results found' : 'No tenants yet'}</div>
            {!search && <a href='/tenants/new' className='btn btn-primary'>+ Add Tenant</a>}
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filtered.map(t => (
              <a key={t.id} href={'/tenants/' + t.id} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + statusColor(t.status), borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: statusBg(t.status), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: statusColor(t.status), flexShrink: 0, border: '1.5px solid ' + statusColor(t.status) }}>
                    {t.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
                      {t.full_name}{t.co_tenant_name ? ' & ' + t.co_tenant_name : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                      📍 {t.unit_address || t.properties?.address || 'No property'}
                    </div>
                    {t.email && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{t.email}{t.phone ? ' · ' + t.phone : ''}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span className={'chip ' + chipClass(t.status)} style={{ textTransform: 'capitalize' }}>{t.status}</span>
                    <button onClick={e => { e.preventDefault(); sendPortalLink(t) }} disabled={sendingId === t.id} title='Send portal login link' style={{ background: 'transparent', color: 'var(--green)', border: '0.5px solid var(--border2)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: sendingId === t.id ? 'not-allowed' : 'pointer', opacity: sendingId === t.id ? 0.6 : 1, whiteSpace: 'nowrap' }}>{sendingId === t.id ? '…' : '✉ Portal'}</button>
                    <button onClick={e => { e.preventDefault(); deleteTenant(t.id, t.full_name) }} style={{ background: 'transparent', color: 'var(--text3)', border: '0.5px solid var(--border2)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}