'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { getProperties, fm, formatDate, type Property } from '@/lib/supabase'

const USER_ID = 'cacb3a74-75d7-4e07-af71-6db4fdde9a92'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'cards' | 'table'>('cards')

  useEffect(() => {
    getProperties(USER_ID).then(data => { setProperties(data); setLoading(false) })
  }, [])

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Properties</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setView(v => v === 'cards' ? 'table' : 'cards')} className="btn btn-ghost" style={{ fontSize: '11px' }}>
            {view === 'cards' ? '☰ Table' : '⊞ Cards'}
          </button>
          <a href="/properties/new" className="btn btn-primary" style={{ fontSize: '11px' }}>+ Add Property</a>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Properties', value: properties.length },
            { label: 'Occupied',         value: properties.filter(p=>p.occupancy_status==='occupied').length, color: '#4ADE9A' },
            { label: 'Vacant',           value: properties.filter(p=>p.occupancy_status==='vacant').length,   color: '#FBB040' },
            { label: 'Portfolio Value',  value: fm(properties.reduce((s,p)=>s+(p.market_value||0),0)) },
            { label: 'Total Purchased',  value: fm(properties.reduce((s,p)=>s+(p.purchase_price||0),0)) },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: (mc as any).color || '#F0EEE8', marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading properties…</div>
        ) : view === 'cards' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '12px' }}>
            {properties.map(p => (
              <div key={p.id} style={{
                background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)',
                borderTop: `2px solid ${p.occupancy_status==='occupied'?'#4ADE9A':'#FBB040'}`,
                borderRadius: '10px', padding: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8' }}>{p.address}</div>
                    <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>{p.city}, {p.state} {p.zip}</div>
                  </div>
                  <span className={`chip ${p.occupancy_status==='occupied'?'chip-g':'chip-a'}`}>
                    {p.occupancy_status === 'occupied' ? 'Occupied' : 'Vacant'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {[
                    ['Type',       p.type?.replace('_',' ') || '—'],
                    ['Ownership',  p.owner_entity || 'Self'],
                    ['Beds/Baths', `${p.bedrooms||'—'}bd / ${p.bathrooms||'—'}ba`],
                    ['Sq Ft',      p.sqft ? p.sqft.toLocaleString() : '—'],
                    ['Purchased',  fm(p.purchase_price)],
                    ['Market Val', fm(p.market_value)],
                  ].map(([k,v]) => (
                    <div key={k} style={{ background: '#1E1E1B', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#5A5A56' }}>{k}</div>
                      <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#F0EEE8', marginTop: '2px', textTransform: 'capitalize' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a href={`/properties/${p.id}`} className="btn btn-ghost" style={{ fontSize: '11px', flex: 1, justifyContent: 'center' }}>View Details</a>
                  <a href={`/mortgage?property=${p.id}`} className="btn btn-ghost" style={{ fontSize: '11px', flex: 1, justifyContent: 'center' }}>Mortgage</a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Address</th><th>Type</th><th>Ownership</th>
                  <th>Purchase Price</th><th>Market Value</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#F0EEE8' }}>{p.address}</div>
                      <div style={{ fontSize: '11px', color: '#5A5A56' }}>{p.city}, {p.state}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{p.type?.replace('_',' ') || '—'}</td>
                    <td>{p.owner_entity || 'Self'}</td>
                    <td style={{ color: '#F0EEE8' }}>{fm(p.purchase_price)}</td>
                    <td style={{ color: '#4ADE9A', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>{fm(p.market_value)}</td>
                    <td><span className={`chip ${p.occupancy_status==='occupied'?'chip-g':'chip-a'}`}>{p.occupancy_status}</span></td>
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
