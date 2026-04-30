'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '▣' },
      { href: '/calendar',  label: 'Calendar',  icon: '📅', badge: '' },
      { href: '/alerts',    label: 'Due Dates',  icon: '◉', badge: '3', badgeColor: 'nb-r' },
    ],
  },
  {
    label: 'Leasing',
    items: [
      { href: '/listings',     label: 'Listings',     icon: '◈', badge: '2', badgeColor: 'nb-a' },
      { href: '/applications', label: 'Applications', icon: '◎' },
      { href: '/screening',    label: 'Screening',    icon: '◉' },
      { href: '/leases',       label: 'E-Sign Leases',icon: '◈' },
    ],
  },
  {
    label: 'Properties',
    items: [
      { href: '/properties',  label: 'Properties',  icon: '▣' },
      { href: '/tenants',     label: 'Tenants',     icon: '◎' },
      { href: '/maintenance', label: 'Maintenance', icon: '◈' },
      { href: '/turnover',    label: 'Turnover',    icon: '↻' },
    ],
  },
  {
    label: 'Finances',
    items: [
      { href: '/payments',  label: 'Payments',   icon: '◈', badge: '3', badgeColor: 'nb-a' },
      { href: '/income',    label: 'Income',     icon: '▣' },
      { href: '/mortgage',  label: 'Mortgage',   icon: '◉' },
      { href: '/expenses',  label: 'Expenses',   icon: '◎' },
      { href: '/tax',       label: 'Tax Reports',icon: '◎' },
      { href: '/quickbooks',label: 'QuickBooks', icon: '↓' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/messages',  label: 'Messages',   icon: '◎', badge: '2', badgeColor: 'nb-r' },
      { href: '/market',    label: 'Market Data',icon: '↗' },
    ],
  },
]

const badgeStyles: Record<string, string> = {
  'nb-r': 'background:rgba(248,113,113,0.1);color:#F87171',
  'nb-a': 'background:rgba(251,176,64,0.1);color:#FBB040',
  'nb-g': 'background:rgba(74,222,154,0.1);color:#4ADE9A',
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <nav style={{
      width: '200px', minWidth: '200px',
      background: '#161614',
      borderRight: '0.5px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      padding: '0', overflowY: 'auto', flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{
        padding: '16px 16px 14px',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: '9px',
      }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: '#4ADE9A', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#0E0E0C',
          fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 800,
          flexShrink: 0,
        }}>P</div>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700, color: '#F0EEE8', lineHeight: 1.1 }}>PropManager</div>
          <div style={{ fontSize: '9px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '1px' }}>Pro · Linda Rodriguez</div>
        </div>
      </div>

      {/* Nav Groups */}
      {navGroups.map(group => (
        <div key={group.label} style={{ padding: '10px 0 4px' }}>
          <div style={{
            fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: '#5A5A56', padding: '0 16px 5px',
          }}>{group.label}</div>
          {group.items.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '7px 16px', cursor: 'pointer', fontSize: '12.5px',
                  color: isActive ? '#4ADE9A' : '#A8A69E',
                  background: isActive ? 'rgba(74,222,154,0.06)' : 'transparent',
                  borderLeft: isActive ? '2px solid #4ADE9A' : '2px solid transparent',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', opacity: 0.8 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      fontSize: '9px', padding: '1px 5px', borderRadius: '6px',
                      fontWeight: 700, ...Object.fromEntries(
                        (badgeStyles[item.badgeColor || ''] || '').split(';')
                          .filter(Boolean).map(s => s.split(':').map(x => x.trim()))
                      ) as any
                    }}>{item.badge}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
