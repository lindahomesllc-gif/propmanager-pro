'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// New-user activation checklist shown on the dashboard until the account is set
// up (or dismissed). Guides a fresh trial signup through the first key actions
// instead of dropping them into an empty app.
export default function GettingStarted() {
  const [counts, setCounts] = useState<any>(null)
  const [dismissed, setDismissed] = useState(true) // default hidden until we know

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('gettingStartedDismissed') === '1') return
    setDismissed(false)
    ;(async () => {
      const head = { count: 'exact' as const, head: true }
      const [prop, ten, lease, ent, prof] = await Promise.all([
        supabase.from('properties').select('id', head),
        supabase.from('tenants').select('id', head),
        supabase.from('leases').select('id', head),
        supabase.from('entities').select('id', head),
        supabase.from('users').select('stripe_account_id').maybeSingle(),
      ])
      setCounts({
        properties: prop.count || 0,
        tenants: ten.count || 0,
        leases: lease.count || 0,
        entities: ent.count || 0,
        bank: !!prof.data?.stripe_account_id,
      })
    })()
  }, [])

  function dismiss() { localStorage.setItem('gettingStartedDismissed', '1'); setDismissed(true) }

  if (dismissed || !counts) return null

  const steps = [
    { done: counts.properties > 0, label: 'Add your first property', href: '/properties/new' },
    { done: counts.tenants > 0,    label: 'Add a tenant',            href: '/tenants/new' },
    { done: counts.leases > 0,     label: 'Create a lease',          href: '/leases/new' },
    { done: counts.entities > 0,   label: 'Set up your entity (LLC / 401k / trust)', href: '/entities' },
    { done: counts.bank,           label: 'Connect your bank to collect rent', href: '/get-paid' },
  ]
  const completed = steps.filter(s => s.done).length
  if (completed === steps.length) return null // fully set up — nothing to show

  const pct = Math.round((completed / steps.length) * 100)

  return (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--green)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>👋 Get started</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{completed} of {steps.length} done — a few steps to get your portfolio running.</div>
        </div>
        <button onClick={dismiss} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer' }}>Dismiss</button>
      </div>

      <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '20px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'var(--green)', borderRadius: '20px', transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        {steps.map(s => (
          <a key={s.label} href={s.done ? undefined : s.href} style={{ textDecoration: 'none', pointerEvents: s.done ? 'none' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '0.5px solid var(--border)', opacity: s.done ? 0.6 : 1 }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, background: s.done ? 'var(--green)' : 'transparent', color: s.done ? '#fff' : 'var(--text3)', border: s.done ? 'none' : '1.5px solid var(--border2)' }}>{s.done ? '✓' : ''}</div>
              <div style={{ flex: 1, fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</div>
              {!s.done && <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 700 }}>Start →</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
