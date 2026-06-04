'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ready, setReady] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // The recovery link establishes a session (Supabase detects the token in
    // the URL). Once we have a session, the user can set a new password.
    supabase.auth.getSession().then(({ data }) => { setReady(!!data.session); setChecked(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setReady(true); setChecked(true) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function save() {
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setError(''); setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  const card = { background: '#fff', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5A56', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '6px' }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2D6A4F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, margin: '0 auto 12px' }}>P</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: '#1A1A18' }}>Set a new password</div>
        </div>

        {done ? (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A18' }}>Password updated</div>
            <div style={{ fontSize: '13px', color: '#5A5A56', marginTop: '6px' }}>Taking you to your dashboard…</div>
          </div>
        ) : !checked ? (
          <div style={{ ...card, textAlign: 'center', color: '#9A9A96', fontSize: '13px' }}>Loading…</div>
        ) : !ready ? (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A18', marginBottom: '8px' }}>Open this from your reset link</div>
            <div style={{ fontSize: '13px', color: '#5A5A56', lineHeight: 1.6 }}>This page needs to be opened from the password-reset email link. Request one from the sign-in page.</div>
            <a href='/forgot-password' className='btn btn-ghost' style={{ marginTop: '18px', justifyContent: 'center' }}>Request a reset link</a>
          </div>
        ) : (
          <div style={card}>
            {error && <div style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
            <label style={lbl}>New Password</label>
            <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='At least 6 characters' className='input' style={{ marginBottom: '14px' }} />
            <label style={lbl}>Confirm Password</label>
            <input type='password' value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder='Re-enter password' className='input' style={{ marginBottom: '20px' }} />
            <button onClick={save} disabled={loading} className='btn btn-primary' style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '14px' }}>{loading ? 'Saving…' : 'Update password'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
