'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('tenants').select('*, properties(address)').eq('user_id', USER_ID).order('full_name')
      .then(({ data }) => { setTenants(data || []); setLoading(false) })
  }, [])

  async function deleteTenant(id, name) {
    if (!confirm('Delete ' + name + '? This cannot be undone.')) return
    const { error } = await supabase.from('tenants').delete().eq('id', id).eq('user_id', USER_ID)
    if (error) { alert('Error: ' + error.message); return }
    setTenants(prev => prev.filter(t => t.id !== id))
  }

  const statusColor = (s) => ({ active: 'var(--green)', past: 'var(--text3)', applicant: 'var(--amber)' }[s] || 'var(--text3)')
  const statusBg = (s) => ({ active: 'var(--green-bg)', past: 'var(--bg3)', applicant: 'var(--amber-bg)' }[s] || 'var(--bg3)')

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Tenants</div>
        <a href='/tenants/new' style={{ background: 'var(--green)', color: '#fff', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>+ Add Tenant</a>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Loading tenants...</div>}
        {!loading && tenants.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '16px' }}>No tenants yet</div>
            <a href='/tenants/new' style={{ background: 'var(--green)', color: '#fff', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ Add Tenant</a>
          </div>
        )}
        {!loading && tenants.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {tenants.map(t => (
              <div key={t.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>
                  {t.full_name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t.full_name}{t.co_tenant_name ? ' & ' + t.co_tenant_name : ''}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{t.unit_address || t.properties?.address || 'No property'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{t.email}{t.phone ? ' · ' + t.phone : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: statusBg(t.status), color: statusColor(t.status), fontWeight: 600, textTransform: 'capitalize' }}>{t.status}</span>
                  <a href={'/tenants/' + t.id} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', textDecoration: 'none' }}>View</a>
                  <button onClick={() => deleteTenant(t.id, t.full_name)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}