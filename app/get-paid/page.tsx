'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function GetPaidPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  async function authToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  async function loadStatus() {
    try {
      const res = await fetch('/api/stripe/account-status', { headers: { Authorization: 'Bearer ' + (await authToken()) } })
      setStatus(await res.json())
    } catch { setStatus({ error: 'Could not load status' }) }
    setLoading(false)
  }

  useEffect(() => { loadStatus() }, [])

  async function connect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST', headers: { Authorization: 'Bearer ' + (await authToken()) } })
      const json = await res.json()
      if (json.url) { window.location.href = json.url; return }
      alert('Could not start setup: ' + (json.error || 'unknown error'))
    } catch (e: any) { alert('Error: ' + (e?.message || e)) }
    setConnecting(false)
  }

  const connected = status?.connected
  const inProgress = status?.hasAccount && !status?.connected

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Get Paid</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: '620px' }}>
          {loading ? (
            <div className='skeleton' style={{ height: '160px', borderRadius: '12px' }} />
          ) : (
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{ fontSize: '28px' }}>{connected ? '✅' : '🏦'}</div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                    {connected ? 'Bank account connected' : inProgress ? 'Setup in progress' : 'Connect your bank to collect rent'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>
                    {connected
                      ? 'Tenants can now pay rent online — money goes straight to your bank.'
                      : inProgress
                      ? 'You started setup but it isn’t finished. Continue to enable payments.'
                      : 'Tenants pay rent by bank transfer or card; payouts land in your account.'}
                  </div>
                </div>
              </div>

              {connected && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '14px 0 4px' }}>
                  <span className='chip chip-g'>Charges enabled</span>
                  <span className='chip chip-g'>Payouts enabled</span>
                </div>
              )}

              <div style={{ marginTop: '18px' }}>
                <button onClick={connect} disabled={connecting} className='btn btn-primary' style={{ padding: '10px 18px', fontSize: '14px' }}>
                  {connecting ? 'Opening…' : connected ? 'Manage / update details' : inProgress ? 'Continue setup' : 'Connect bank account'}
                </button>
              </div>

              <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '0.5px solid var(--border)', fontSize: '12px', color: 'var(--text3)', lineHeight: 1.6 }}>
                🔒 Banking details are collected and secured by <strong>Stripe</strong> — PropManager never sees or stores them. ACH bank transfers have low fees (best for rent); cards are also accepted.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
