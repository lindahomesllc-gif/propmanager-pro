'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function login() {
    if (!email || !password) { setError('Enter your email and password.'); return }
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2D6A4F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, margin: '0 auto 12px' }}>P</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: '#1A1A18' }}>PropManager Pro</div>
          <div style={{ fontSize: '13px', color: '#9A9A96', marginTop: '4px' }}>Sign in to your landlord dashboard</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          {error && <div style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email</label>
          <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='you@email.com' className='input' style={{ marginBottom: '14px' }} />
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Password</label>
          <input type='password' value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder='••••••••' className='input' style={{ marginBottom: '20px' }} />
          <button onClick={login} disabled={loading} className='btn btn-primary' style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '14px' }}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </div>

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#9A9A96', marginTop: '18px' }}>
          New here? <a href='/signup' style={{ color: '#2D6A4F', fontWeight: 600, textDecoration: 'none' }}>Create an account</a>
        </div>
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#9A9A96', marginTop: '8px' }}>
          Are you a tenant? <a href='/portal' style={{ color: '#2D6A4F', textDecoration: 'none' }}>Tenant portal →</a>
        </div>
      </div>
    </div>
  )
}
