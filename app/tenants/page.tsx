'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID } from '@/lib/supabase'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id, full_name, email, phone, status, properties(address)')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTenants(data || []); setLoading(false) })
  }, [])

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Tenants</div>
        <a href="/tenants/new" style={{ background: 'var(--green)', color: 'var(--bg)', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>+ Add Tenant</a>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Loading tenants...</div>}
        {!loading && tenants.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '16px' }}>No tenants yet</div>
            <a href="/tenants/new" style={{ background: 'var(--green)', color: 'var(--bg)', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ Add Tenant</a>
          </div>
        )}
        {!loading && tenants.length > 0 && (
          <div style={{ display: 'grid', gap: '10px' }}>
            {tenants.map(t => (
              <div key={t.id} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#4ADE9A22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'var(--green)' }}>
                    {t.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{t.full_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{t.properties?.address || 'No property'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{t.email}{t.phone ? ' · ' + t.phone : ''}</div>
                  </div>
                </div>
                <a href={`/tenants/${t.id}`} style={{ color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>View</a>
                  <button onClick={() => deleteTenant(t.id, t.full_name)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}