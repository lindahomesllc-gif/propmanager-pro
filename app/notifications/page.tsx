'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const [form, setForm] = useState<any>({ notify_email: true, notify_sms: false, notify_phone: '', email: '' })

  async function authHeaders() {
    const { data } = await supabase.auth.getSession()
    return { Authorization: 'Bearer ' + (data.session?.access_token || ''), 'Content-Type': 'application/json' }
  }

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/notifications/prefs', { headers: await authHeaders() })
      if (res.ok) setForm(await res.json())
      setLoading(false)
    })()
  }, [])

  async function save() {
    setSaving(true); setSaved(false)
    const res = await fetch('/api/notifications/prefs', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    else alert('Could not save: ' + ((await res.json().catch(() => ({}))).error || res.status))
  }

  async function sendTest() {
    setTesting(true); setTestMsg('')
    const res = await fetch('/api/notifications/test', { method: 'POST', headers: await authHeaders() })
    const j = await res.json().catch(() => ({}))
    setTesting(false)
    if (!res.ok) { setTestMsg('⚠ ' + (j.error || 'Failed to send test.')); return }
    const parts: string[] = []
    if (j.email) parts.push('Email: ' + label(j.email))
    if (j.sms) parts.push('SMS: ' + label(j.sms))
    if (!j.email && !j.sms) parts.push('Nothing sent — add a channel below.')
    setTestMsg(parts.join('  ·  ') + (j.items === 0 ? '  (you have no due items, so a confirmation was sent)' : ''))
  }
  const label = (s: string) => s === 'sent' ? '✅ sent' : s === 'email_not_configured' ? '⚙ not set up (SendGrid)' : s === 'sms_not_configured' ? '⚙ not set up (Twilio)' : '⚠ ' + s

  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const inp = { width: '100%', padding: '9px 12px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const, maxWidth: '280px' }
  const Toggle = ({ on, onClick }: any) => (
    <button onClick={onClick} style={{ width: '42px', height: '24px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: on ? 'var(--green)' : 'var(--border2)', position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '2px', left: on ? '20px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
    </button>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🔔 Notifications</div>
        <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '720px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '18px' }}>
          Get a <strong>daily digest</strong> of everything coming due — rent, lease expirations, insurance &amp; property-tax dates, warranties, LLC annual reports, preventive maintenance, and urgent repairs — so you don&apos;t have to remember to check.
        </div>

        {loading ? <div className='skeleton' style={{ height: '200px' }} /> : (
          <>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>📧 Email digest</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>Daily to <strong>{form.email || 'your account email'}</strong></div>
                </div>
                <Toggle on={form.notify_email} onClick={() => setForm((f: any) => ({ ...f, notify_email: !f.notify_email }))} />
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.notify_sms ? '14px' : '0' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>📱 Text message (SMS)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>A short summary text each day</div>
                </div>
                <Toggle on={form.notify_sms} onClick={() => setForm((f: any) => ({ ...f, notify_sms: !f.notify_sms }))} />
              </div>
              {form.notify_sms && (
                <div>
                  <label style={lbl}>Cell number</label>
                  <input style={inp} placeholder='+1 407 555 0100' value={form.notify_phone || ''} onChange={e => setForm((f: any) => ({ ...f, notify_phone: e.target.value }))} />
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '5px' }}>Use the full number with country code (e.g. +14075550100).</div>
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={sendTest} disabled={testing} className='btn btn-ghost'>{testing ? 'Sending…' : '✉ Send me a test now'}</button>
                {testMsg && <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{testMsg}</div>}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '10px' }}>Tip: save first, then send a test to confirm it reaches your inbox/phone.</div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6, background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <strong>Heads up — one-time setup in Vercel for live sending:</strong><br />
              • <strong>Email</strong> needs <code>SENDGRID_API_KEY</code> + <code>NOTIFY_FROM</code> (a verified sender).<br />
              • <strong>SMS</strong> needs a Twilio account + number: <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, <code>TWILIO_FROM</code> (US texting also requires Twilio A2P registration).<br />
              If a test shows &ldquo;not set up,&rdquo; that env var isn&apos;t in Vercel yet — tell me and I&apos;ll walk you through it.
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
