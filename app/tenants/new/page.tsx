'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { getTenants, formatDate, type Tenant } from '@/lib/supabase'

const USER_ID = 'cacb3a74-75d7-4e07-af71-6db4fdde9a92'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTenants(USER_ID).then(data => { setTenants(data); setLoading(false) })
  }, [])

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Tenants</div>
        <a href="/tenants/new" style={{ background: '#4ADE9A', color: '#0E0E0C', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>+ Add Tenant</a>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading tenants…</div>
        ) : tenants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56', fontSize: '13px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👤</div>
            No tenants yet. Add your first tenant to get started.
            <div style={{ marginTop: '12px' }}>
              <a href="/tenants/new" style={{ background: '#4ADE9A', color: '#0E0E0C', border: 'none', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Add First Tenant</a>
            </div>
          </div>
        ) : (
          <div style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr>
                  {['Name','Email','Phone','Move In','Status','Portal'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#1E3D2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#4ADE9A', flexShrink: 0 }}>
                          {t.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div style={{ fontWeight: 600, color: '#F0EEE8' }}>{t.full_name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#60A5FA' }}>{t.email || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#A8A69E' }}>{t.phone || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#A8A69E' }}>{formatDate(t.move_in_date)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: 700, background: t.status === 'active' ? 'rgba(74,222,154,0.1)' : 'rgba(90,90,86,0.2)', color: t.status === 'active' ? '#4ADE9A' : '#A8A69E', border: `0.5px solid ${t.status === 'active' ? 'rgba(74,222,154,0.25)' : 'rgba(90,90,86,0.3)'}` }}>{t.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: 700, background: t.portal_access ? 'rgba(74,222,154,0.1)' : 'rgba(90,90,86,0.2)', color: t.portal_access ? '#4ADE9A' : '#A8A69E', border: `0.5px solid ${t.portal_access ? 'rgba(74,222,154,0.25)' : 'rgba(90,90,86,0.3)'}` }}>{t.portal_access ? 'Enabled' : 'Disabled'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
