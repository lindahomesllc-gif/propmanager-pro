'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function signup() {
    if (!email || !password) { setError('Enter your email and a password.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/login' : undefined,
      },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    // If email confirmation is on, there's a user but no session yet.
    if (data.session) { router.push('/dashboard'); return }
    setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2D6A4F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, margin: '0 auto 12px' }}>P</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: '#1A1A18' }}>Create your account</div>
          <div style={{ fontSize: '13px', color: '#9A9A96', marginTop: '4px' }}>Start managing your properties</div>
        </div>

        {sent ? (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📬</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A18', marginBottom: '8px' }}>Confirm your email</div>
            <div style={{ fontSize: '13px', color: '#5A5A56', lineHeight: 1.6 }}>We sent a confirmation link to <strong>{email}</strong>. Click it, then sign in.</div>
            <a href='/login' className='btn btn-ghost' style={{ marginTop: '18px', justifyContent: 'center' }}>Go to sign in</a>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
            {error && <div style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder='Jane Landlord' className='input' style={{ marginBottom: '14px' }} />
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email</label>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='you@email.com' className='input' style={{ marginBottom: '14px' }} />
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Password</label>
            <input type='password' value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && signup()} placeholder='At least 6 characters' className='input' style={{ marginBottom: '20px' }} />
            <button onClick={signup} disabled={loading} className='btn btn-primary' style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '14px' }}>{loading ? 'Creating…' : 'Create Account'}</button>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#9A9A96', marginTop: '18px' }}>
          Already have an account? <a href='/login' style={{ color: '#2D6A4F', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
        </div>
      </div>
    </div>
  )
}
