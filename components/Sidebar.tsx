'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase, USER_ID } from '@/lib/supabase'

type NavItem = { href: string; label: string; icon: string; badgeKey?: string }
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Manage',
    items: [
      { href: '/dashboard',   label: 'Dashboard',   icon: '▣' },
      { href: '/properties',  label: 'Properties',  icon: '▤' },
      { href: '/entities',    label: 'Entities',    icon: '▦' },
      { href: '/tenants',     label: 'Tenants',     icon: '◎' },
      { href: '/payments',    label: 'Payments',    icon: '◈', badgeKey: 'latePayments' },
      { href: '/maintenance', label: 'Maintenance', icon: '◧', badgeKey: 'openMaint' },
      { href: '/messages',    label: 'Messages',    icon: '◍', badgeKey: 'unreadMsgs' },
    ],
  },
  {
    label: 'Leasing',
    items: [
      { href: '/listings',     label: 'Listings',     icon: '◈' },
      { href: '/applications', label: 'Applications', icon: '◎' },
      { href: '/screening',    label: 'Screening',    icon: '◉' },
      { href: '/leases',       label: 'E-Sign Leases',icon: '✎' },
      { href: '/turnover',     label: 'Turnover',     icon: '↻' },
    ],
  },
  {
    label: 'Finances',
    items: [
      { href: '/get-paid',  label: 'Get Paid',   icon: '◆' },
      { href: '/income',    label: 'Income',     icon: '▣' },
      { href: '/expenses',  label: 'Expenses',   icon: '◎' },
      { href: '/mortgage',  label: 'Mortgage',   icon: '◉' },
      { href: '/tax',       label: 'Tax Reports',icon: '▦' },
      { href: '/reports',   label: 'Reports',    icon: '▤' },
      { href: '/quickbooks',label: 'QuickBooks', icon: '↓' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { href: '/calendar', label: 'Calendar',   icon: '📅' },
      { href: '/alerts',   label: 'Due Dates',  icon: '◉', badgeKey: 'expiringLeases' },
      { href: '/market',   label: 'Market Data',icon: '↗' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/billing', label: 'Billing', icon: '◆' },
      { href: '/export',  label: 'Export & Backup', icon: '⬇' },
    ],
  },
]

const BADGE_STYLE: Record<string, { bg: string; fg: string }> = {
  latePayments:   { bg: 'var(--red-bg)',   fg: 'var(--red)' },
  unreadMsgs:     { bg: 'var(--red-bg)',   fg: 'var(--red)' },
  openMaint:      { bg: 'var(--amber-bg)', fg: 'var(--amber)' },
  expiringLeases: { bg: 'var(--amber-bg)', fg: 'var(--amber)' },
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [userLabel, setUserLabel] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (u) setUserLabel(u.user_metadata?.full_name || u.email || '')
    })
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      const today = new Date().toISOString().split('T')[0]
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const head = { count: 'exact' as const, head: true }
      const [late, unread, maint, expiring] = await Promise.all([
        supabase.from('payments').select('id', head).eq('status', 'late'),
        supabase.from('messages').select('id', head).eq('sender', 'tenant').is('read_at', null),
        supabase.from('maintenance').select('id', head).in('status', ['open', 'scheduled', 'in_progress']),
        supabase.from('leases').select('id', head).eq('status', 'executed').gte('end_date', today).lte('end_date', in30),
      ])
      if (cancelled) return
      setCounts({
        latePayments: late.count || 0,
        unreadMsgs: unread.count || 0,
        openMaint: maint.count || 0,
        expiringLeases: expiring.count || 0,
      })
    }
    loadCounts()
    return () => { cancelled = true }
  }, [])

  return (
    <nav style={{
      width: '200px', minWidth: '200px',
      background: 'var(--bg2)',
      borderRight: '0.5px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '0', overflowY: 'auto', flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{
        padding: '16px 16px 14px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '9px',
      }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: 'var(--green)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff',
          fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 800,
          flexShrink: 0,
        }}>P</div>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>PropManager</div>
          <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{userLabel || 'Pro'}</div>
        </div>
      </div>

      {/* Nav Groups */}
      {navGroups.map(group => (
        <div key={group.label} style={{ padding: '10px 0 4px' }}>
          <div style={{
            fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--text3)', padding: '0 16px 5px',
          }}>{group.label}</div>
          {group.items.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const badgeCount = item.badgeKey ? (counts[item.badgeKey] || 0) : 0
            const badgeStyle = item.badgeKey ? BADGE_STYLE[item.badgeKey] : null
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '7px 16px', cursor: 'pointer', fontSize: '12.5px',
                  color: isActive ? 'var(--green)' : 'var(--text2)',
                  background: isActive ? 'var(--green-bg)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--green)' : '2px solid transparent',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', opacity: 0.8 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badgeCount > 0 && badgeStyle && (
                    <span style={{
                      fontSize: '9px', minWidth: '16px', textAlign: 'center',
                      padding: '1px 5px', borderRadius: '8px', fontWeight: 700,
                      background: badgeStyle.bg, color: badgeStyle.fg,
                    }}>{badgeCount}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ))}

      <div style={{ marginTop: 'auto', padding: '10px 12px', borderTop: '0.5px solid var(--border)' }}>
        <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text2)', borderRadius: '6px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', opacity: 0.8 }}>⎋</span>
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  )
}
