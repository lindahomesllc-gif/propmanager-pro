'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Public marketing / landing page at "/". Logged-in landlords are sent straight
// to their dashboard; everyone else sees the pitch + sign-up CTAs.
export default function Landing() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace('/dashboard') })
  }, [])

  const wrap: any = { maxWidth: '1080px', margin: '0 auto', padding: '0 24px' }
  const btnPrimary: any = { background: 'var(--green)', color: '#fff', padding: '12px 22px', borderRadius: '9px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', border: 'none', cursor: 'pointer' }
  const btnGhost: any = { background: 'transparent', color: 'var(--text)', padding: '12px 20px', borderRadius: '9px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', border: '0.5px solid var(--border2)' }
  const h2: any = { fontFamily: 'Syne, sans-serif', fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: '10px' }
  const sub: any = { fontSize: '14px', color: 'var(--text3)', textAlign: 'center', maxWidth: '620px', margin: '0 auto 36px', lineHeight: 1.6 }
  const card: any = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '24px' }

  const moat = [
    { icon: '🏛️', title: 'Entities & ownership', body: 'Hold properties across LLCs, Solo 401(k)s, trusts and partnerships — with a separate Schedule E per entity. No other tool does this.' },
    { icon: '🧩', title: 'Units, rooms & fractional', body: 'Multifamily, by-the-room rentals, and partial ownership with “your share” math — built for how investors actually hold property.' },
    { icon: '📊', title: 'Tax-ready by design', body: 'Rent roll, profit & loss, and Schedule E reports that track your real ownership share — ready for your accountant.' },
  ]
  const features = [
    ['💳', 'Online rent', 'Tenants pay by card or bank (ACH). Recurring rent generated automatically.'],
    ['👥', 'Tenant portal', 'Tenants view balances, pay rent, and submit maintenance requests.'],
    ['📝', 'Leases & renewals', 'One-click lease renewals; track every term and rent increase over time.'],
    ['🔧', 'Maintenance', 'Track tickets by priority and age — list or kanban board.'],
    ['💰', 'Expenses & mortgages', 'Log expenses, track loan balances and amortization.'],
    ['📈', 'Reports & export', 'Rent roll, P&L, one-click CSV export, and full data backup.'],
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif', overflowY: 'auto' }}>
      {/* Nav */}
      <div style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 800 }}>P</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 800 }}>PropManager Pro</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a href='/login' style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Log in</a>
            <a href='/signup' style={btnPrimary}>Start free trial</a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ ...wrap, textAlign: 'center', padding: '72px 24px 64px' }}>
        <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, color: 'var(--green)', background: 'var(--green-bg)', border: '0.5px solid var(--green)', padding: '5px 14px', borderRadius: '20px', marginBottom: '22px' }}>Built for investor-landlords</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(32px, 6vw, 54px)', fontWeight: 800, lineHeight: 1.1, margin: '0 auto 18px', maxWidth: '780px' }}>
          Run your rental portfolio the way you actually own it.
        </h1>
        <p style={{ fontSize: 'clamp(15px, 2.2vw, 18px)', color: 'var(--text2)', maxWidth: '640px', margin: '0 auto 30px', lineHeight: 1.6 }}>
          Track properties across LLCs, 401(k)s and partnerships. Collect rent online, automate the books, and stay tax-ready — all for one flat price.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href='/signup' style={{ ...btnPrimary, padding: '14px 28px', fontSize: '15px' }}>Start your 14-day free trial</a>
          <a href='/login' style={{ ...btnGhost, padding: '14px 26px', fontSize: '15px' }}>Log in</a>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '14px' }}>No credit card required.</div>
      </div>

      {/* Differentiators */}
      <div style={{ background: 'var(--bg2)', borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)', padding: '60px 0' }}>
        <div style={wrap}>
          <h2 style={h2}>Why investors choose us</h2>
          <p style={sub}>Most property apps are built for managers handling someone else’s buildings. We’re built for the person who owns them.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {moat.map(m => (
              <div key={m.title} style={card}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{m.icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>{m.title}</div>
                <div style={{ fontSize: '13.5px', color: 'var(--text2)', lineHeight: 1.6 }}>{m.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ ...wrap, padding: '64px 24px' }}>
        <h2 style={h2}>Everything in one place</h2>
        <p style={sub}>The whole job — leasing, rent, maintenance, money, and taxes — without juggling five tools.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {features.map(([icon, title, body]) => (
            <div key={title as string} style={{ ...card, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{title}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text3)', lineHeight: 1.6 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background: 'var(--bg2)', borderTop: '0.5px solid var(--border)', padding: '64px 0' }}>
        <div style={wrap}>
          <h2 style={h2}>One simple price</h2>
          <p style={sub}>No per-unit fees that punish you for growing. Unlimited everything.</p>
          <div style={{ ...card, maxWidth: '420px', margin: '0 auto', textAlign: 'center', padding: '32px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700 }}>PropManager Pro</div>
            <div style={{ margin: '12px 0' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '52px', fontWeight: 800, color: 'var(--green)' }}>$29</span>
              <span style={{ fontSize: '15px', color: 'var(--text3)' }}> / month</span>
            </div>
            <div style={{ textAlign: 'left', margin: '20px 0', display: 'grid', gap: '10px' }}>
              {['Unlimited properties, units & tenants', 'Online rent collection (card + ACH)', 'Entities, units & fractional ownership', 'Tax reports & Schedule E', 'Tenant portal & maintenance', '14-day free trial — no card required'].map(f => (
                <div key={f} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', fontSize: '13.5px', color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 800 }}>✓</span><span>{f}</span>
                </div>
              ))}
            </div>
            <a href='/signup' style={{ ...btnPrimary, width: '100%', padding: '14px', boxSizing: 'border-box' }}>Start free trial</a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '0.5px solid var(--border)', padding: '28px 0' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text3)' }}>© PropManager Pro. Property management for investor-landlords.</div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <a href='/login' style={{ color: 'var(--text2)', textDecoration: 'none' }}>Log in</a>
            <a href='/signup' style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>Start free trial</a>
          </div>
        </div>
      </div>
    </div>
  )
}
