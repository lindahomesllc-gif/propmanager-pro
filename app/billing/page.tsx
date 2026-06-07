'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, formatDate } from '@/lib/supabase'
import { fetchBilling, type Billing } from '@/lib/billing'

export default function BillingPage() {
  const [b, setB] = useState<Billing | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() { setB(await fetchBilling()) }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const sessionId = sp.get('session_id')
    if (sessionId) {
      // returned from Checkout — confirm & activate, then clean the URL
      ;(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch('/api/billing/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {})
        window.history.replaceState({}, '', '/billing')
        setMsg('🎉 You’re subscribed — thank you!')
        load()
      })()
    } else {
      if (sp.get('canceled')) setMsg('Checkout canceled — no charge was made.')
      load()
    }
  }, [])

  async function token() { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token || '' }

  async function subscribe() {
    setBusy(true); setMsg('')
    const res = await fetch('/api/billing/checkout', { method: 'POST', headers: { Authorization: 'Bearer ' + (await token()) } })
    const j = await res.json()
    if (j.url) { window.location.href = j.url; return }
    setMsg(j.error || 'Could not start checkout.'); setBusy(false)
  }

  async function manage() {
    setBusy(true); setMsg('')
    const res = await fetch('/api/billing/portal', { method: 'POST', headers: { Authorization: 'Bearer ' + (await token()) } })
    const j = await res.json()
    if (j.url) { window.location.href = j.url; return }
    setMsg(j.error || 'Could not open billing portal.'); setBusy(false)
  }

  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', maxWidth: '560px' }
  const active = b?.status === 'active'
  const expired = b && !b.entitled
  const pastDue = b?.status === 'past_due' || b?.status === 'unpaid'

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Billing</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {msg && <div style={{ ...card, maxWidth: '560px', marginBottom: '14px', padding: '12px 16px', fontSize: '13px', color: 'var(--text)' }}>{msg}</div>}

        {!b ? (
          <div className='skeleton' style={{ height: '180px', maxWidth: '560px', borderRadius: '12px' }} />
        ) : (
          <div style={card}>
            {/* status header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>PropManager Pro</div>
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>$29 / month · unlimited properties</div>
              </div>
              <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                background: active ? 'var(--green-bg)' : pastDue ? 'var(--red-bg)' : expired ? 'var(--red-bg)' : 'var(--amber-bg)',
                color: active ? 'var(--green)' : pastDue ? 'var(--red)' : expired ? 'var(--red)' : 'var(--amber)' }}>
                {active ? 'Active' : pastDue ? 'Payment failed' : expired ? 'Trial ended' : 'Free trial'}
              </span>
            </div>

            {/* status detail */}
            <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '20px' }}>
              {active && <>Your subscription is active.{b.currentPeriodEnd ? ' Next renewal on ' + formatDate(b.currentPeriodEnd) + '.' : ''}</>}
              {!active && b.inTrial && <>You’re on a free trial — <strong style={{ color: 'var(--text)' }}>{b.trialDaysLeft} day{b.trialDaysLeft === 1 ? '' : 's'} left</strong>. Subscribe any time to keep full access when it ends.</>}
              {!active && pastDue && <>Your last payment failed. Update your card to restore access.</>}
              {!active && !b.inTrial && !pastDue && <>Your free trial has ended. Subscribe to continue using PropManager and keep your data flowing.</>}
            </div>

            {/* actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {!active && <button className='btn btn-primary' onClick={subscribe} disabled={busy}>{busy ? 'Please wait…' : 'Subscribe — $29/mo'}</button>}
              {(active || pastDue || b.stripeCustomerId) && <button className='btn btn-ghost' onClick={manage} disabled={busy}>Manage billing</button>}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '18px', lineHeight: 1.5 }}>
              Secure checkout by Stripe. Cancel anytime from “Manage billing”. Your rent-collection (Stripe Connect) setup is separate and unaffected.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
