'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendReset() {
    if (!email) { setError('Enter your email address.'); return }
    setError(''); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2D6A4F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, margin: '0 auto 12px' }}>P</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: '#1A1A18' }}>Reset your password</div>
          <div style={{ fontSize: '13px', color: '#9A9A96', marginTop: '4px' }}>We'll email you a secure reset link</div>
        </div>

        {sent ? (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📬</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A18', marginBottom: '8px' }}>Check your email</div>
            <div style={{ fontSize: '13px', color: '#5A5A56', lineHeight: 1.6 }}>If an account exists for <strong>{email}</strong>, a password reset link is on its way. The link expires in 1 hour.</div>
            <a href='/login' className='btn btn-ghost' style={{ marginTop: '18px', justifyContent: 'center' }}>Back to sign in</a>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
            {error && <div style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email</label>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReset()} placeholder='you@email.com' className='input' style={{ marginBottom: '20px' }} />
            <button onClick={sendReset} disabled={loading} className='btn btn-primary' style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '14px' }}>{loading ? 'Sending…' : 'Send reset link'}</button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <a href='/login' style={{ fontSize: '12px', color: '#9A9A96', textDecoration: 'none' }}>Back to sign in</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
