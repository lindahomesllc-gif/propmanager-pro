'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, getProperties, getTenants, getPayments, getExpenses, fm, type Property, type Payment } from '@/lib/supabase'

const USER_ID = 'cacb3a74-75d7-4e07-af71-6db4fdde9a92'

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [props, pays] = await Promise.all([
        getProperties(USER_ID),
        getPayments(USER_ID),
      ])
      setProperties(props)
      setPayments(pays)
      setLoading(false)
    }
    load()
  }, [])

  const occupied = properties.filter(p => p.occupancy_status === 'occupied')
  const vacant   = properties.filter(p => p.occupancy_status === 'vacant')
  const due      = payments.filter(p => p.status === 'due')
  const paid     = payments.filter(p => p.status === 'paid')
  const totalEquity = properties.reduce((s, p) => s + (p.market_value || 0), 0)

  const alerts = [
    { label: 'Rent due — all tenants', date: 'May 1', color: '#FBB040' },
    { label: 'Lease expiring — Nguyen Family', date: 'Jun 30', color: '#F87171' },
    { label: 'Insurance renewal — State Farm', date: 'Sep 15', color: '#FBB040' },
    { label: 'Property Tax — All properties', date: 'Nov 1', color: '#5A5A56' },
  ]

  return (
    <AppShell>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        background: '#161614', flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8', letterSpacing: '-0.3px' }}>
          Dashboard
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/properties/new" className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>+ Add Property</a>
          <a href="/tenants/new"    className="btn btn-primary" style={{ fontSize: '11px', padding: '5px 10px' }}>+ Add Tenant</a>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56', fontSize: '13px' }}>
            Loading your properties…
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Properties',      value: properties.length.toString(), color: '',         sub: `${occupied.length} occupied` },
                { label: 'Portfolio Value',  value: fm(totalEquity),              color: '',         sub: '4 properties' },
                { label: 'Payments Due',     value: fm(due.reduce((s,p)=>s+p.amount_due,0)), color: '#FBB040', sub: `${due.length} pending` },
                { label: 'Collected YTD',    value: fm(paid.reduce((s,p)=>s+p.amount_paid,0)), color: '#4ADE9A', sub: `${paid.length} payments` },
                { label: 'Vacant Units',     value: vacant.length.toString(),     color: vacant.length > 0 ? '#FBB040' : '#4ADE9A', sub: 'Need tenants' },
              ].map(mc => (
                <div key={mc.label} style={{
                  background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px', padding: '14px 16px',
                  borderTop: `2px solid ${mc.color || 'rgba(255,255,255,0.07)'}`,
                }}>
                  <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color || '#F0EEE8', marginTop: '5px', lineHeight: 1 }}>{mc.value}</div>
                  <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '4px' }}>{mc.sub}</div>
                </div>
              ))}
            </div>

            {/* Properties Grid */}
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#A8A69E', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Your Properties</div>
              <a href="/properties" style={{ fontSize: '12px', color: '#4ADE9A', textDecoration: 'none' }}>View all →</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {properties.map(p => (
                <a key={p.id} href={`/properties/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#161614',
                    border: `0.5px solid rgba(255,255,255,0.07)`,
                    borderTop: `2px solid ${p.occupancy_status === 'occupied' ? '#4ADE9A' : '#FBB040'}`,
                    borderRadius: '10px', padding: '14px 16px', cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8', marginBottom: '2px' }}>{p.address}</div>
                    <div style={{ fontSize: '11px', color: '#5A5A56', marginBottom: '10px' }}>{p.city} · {p.type?.replace('_', ' ')}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: '#4ADE9A' }}>
                      {fm(0)}<span style={{ fontSize: '12px', fontWeight: 400, color: '#5A5A56', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>/mo</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: '#262623', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                        {p.occupancy_status === 'occupied' ? 'Occupied' : 'Vacant'}
                      </span>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: '#262623', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                        {p.bedrooms}bd / {p.bathrooms}ba
                      </span>
                      {p.market_value && (
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: '#262623', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                          {fm(p.market_value)} value
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Bottom Two Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Upcoming Alerts */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#A8A69E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Upcoming Obligations</div>
                {alerts.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '11px 14px', borderRadius: '7px', marginBottom: '8px',
                    border: '0.5px solid rgba(255,255,255,0.07)', background: '#161614',
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color, flexShrink: 0 }}></div>
                    <div style={{ flex: 1, fontSize: '12.5px', color: '#F0EEE8' }}>{a.label}</div>
                    <div style={{ fontSize: '11px', color: '#5A5A56' }}>{a.date}</div>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#A8A69E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Quick Actions</div>
                <div style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
                  {[
                    { href: '/payments',   icon: '💳', label: 'Collect Rent',         sub: `${due.length} payments due` },
                    { href: '/messages',   icon: '💬', label: 'Messages',             sub: '2 unread' },
                    { href: '/market',     icon: '📈', label: 'Market Analysis',      sub: 'Check rent rates' },
                    { href: '/quickbooks', icon: '⬇️', label: 'Export to QuickBooks', sub: 'YTD report ready' },
                    { href: '/mortgage',   icon: '🏦', label: 'Mortgage & Amortization', sub: '3 active loans' },
                    { href: '/tax',        icon: '🧮', label: 'Tax Reports',          sub: 'Schedule E ready' },
                  ].map((item, i) => (
                    <a key={i} href={item.href} style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '11px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
                        cursor: 'pointer', transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1E1E1B')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: '16px' }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#F0EEE8' }}>{item.label}</div>
                          <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '1px' }}>{item.sub}</div>
                        </div>
                        <span style={{ color: '#5A5A56', fontSize: '12px' }}>→</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
