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
        <a href="/tenants/new" className="btn btn-primary" style={{ fontSize: '11px' }}>+ Add Tenant</a>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading tenants…</div>
        ) : tenants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56', fontSize: '13px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👤</div>
            No tenants yet. Add your first tenant to get started.
            <div style={{ marginTop: '12px' }}>
              <a href="/tenants/new" className="btn btn-primary">Add First Tenant</a>
            </div>
          </div>
        ) : (
          <div className="card">
            <table className="tbl">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Move In</th><th>Status</th><th>Portal</th></tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#1E3D2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#4ADE9A', flexShrink: 0 }}>
                          {t.full_name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                        </div>
                        <div style={{ fontWeight: 600, color: '#F0EEE8' }}>{t.full_name}</div>
                      </div>
                    </td>
                    <td style={{ color: '#60A5FA' }}>{t.email || '—'}</td>
                    <td>{t.phone || '—'}</td>
                    <td>{formatDate(t.move_in_date)}</td>
                    <td><span className={`chip ${t.status==='active'?'chip-g':t.status==='past'?'chip-x':'chip-b'}`}>{t.status}</span></td>
                    <td><span className={`chip ${t.portal_access?'chip-g':'chip-x'}`}>{t.portal_access?'Enabled':'Disabled'}</span></td>
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
