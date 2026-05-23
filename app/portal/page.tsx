'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function TenantPortalLogin() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendMagicLink() {
    if (!email) { setError('Please enter your email address'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
      }
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', background: '#2D6A4F', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 12px' }}>🏠</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A', fontFamily: 'Syne, sans-serif' }}>Tenant Portal</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Linda Homes LLC</div>
        </div>

        {!sent ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A1A', marginBottom: '6px' }}>Sign in to your portal</div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>Enter your email and we'll send you a secure login link — no password needed.</div>

            {error && <div style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email Address</label>
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
                placeholder='your@email.com'
                style={{ width: '100%', padding: '12px 14px', fontSize: '14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', outline: 'none', boxSizing: 'border-box', background: '#FAFAFA' }}
              />
            </div>

            <button
              onClick={sendMagicLink}
              disabled={loading}
              style={{ width: '100%', background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending...' : 'Send me a login link →'}
            </button>

            <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '16px' }}>
              Only registered tenants can access this portal.<br />Contact your landlord if you need help.
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>Check your email!</div>
            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', marginBottom: '20px' }}>
              We sent a secure login link to<br />
              <strong style={{ color: '#1A1A1A' }}>{email}</strong><br /><br />
              Click the link in your email to access your portal. The link expires in 1 hour.
            </div>
            <button onClick={() => { setSent(false); setEmail('') }} style={{ background: 'transparent', color: '#2D6A4F', border: '1.5px solid #2D6A4F', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Try a different email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
