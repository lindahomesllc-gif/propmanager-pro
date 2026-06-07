'use client'
import { useEffect, useState } from 'react'
import { fetchBilling, type Billing } from '@/lib/billing'

// Thin banner shown during the free trial (and on payment problems), nudging to
// /billing. Hidden once the subscription is active.
export default function TrialBanner() {
  const [b, setB] = useState<Billing | null>(null)
  useEffect(() => { fetchBilling().then(setB) }, [])
  if (!b) return null

  const pastDue = b.status === 'past_due' || b.status === 'unpaid'
  if (!b.inTrial && !pastDue) return null

  const danger = pastDue || b.trialDaysLeft <= 3
  const msg = pastDue
    ? 'Your payment failed — update your card to keep your account active.'
    : `${b.trialDaysLeft} day${b.trialDaysLeft === 1 ? '' : 's'} left in your free trial.`

  return (
    <a href='/billing' style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        padding: '8px 16px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
        background: danger ? 'var(--red-bg)' : 'var(--amber-bg)',
        color: danger ? 'var(--red)' : 'var(--amber)',
        borderBottom: '0.5px solid ' + (danger ? 'var(--red)' : 'var(--amber)'),
      }}>
        <span>{msg}</span>
        <span style={{ background: danger ? 'var(--red)' : 'var(--amber)', color: '#fff', padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
          {pastDue ? 'Fix billing →' : 'Subscribe $29/mo →'}
        </span>
      </div>
    </a>
  )
}
