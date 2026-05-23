'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function TenantDashboard() {
  const [tenant, setTenant] = useState(null)
  const [lease, setLease] = useState(null)
  const [payments, setPayments] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/portal'); return }

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*, properties(address, city, state)')
        .eq('email', user.email)
        .eq('status', 'active')
        .single()

      if (!tenantData) { router.push('/portal'); return }
      setTenant(tenantData)

      const [l, p, m] = await Promise.all([
        supabase.from('leases').select('*').eq('tenant_id', tenantData.id).eq('status', 'executed').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('payments').select('*').eq('tenant_id', tenantData.id).order('due_date', { ascending: false }).limit(5),
        supabase.from('maintenance').select('*, properties(address)').eq('tenant_id', tenantData.id).order('created_at', { ascending: false }).limit(3),
      ])
      setLease(l.data)
      setPayments(p.data || [])
      setMaintenance(m.data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/portal')
  }

  const fm = (n) => n ? '$' + Number(n).toLocaleString() : '—'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24)) : null

  const nextPayment = payments.find(p => p.status === 'due' || p.status === 'upcoming')
  const daysUntilExpiry = lease?.end_date ? daysUntil(lease.end_date) : null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F6F8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏠</div>
        Loading your portal...
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F3', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: '#2D6A4F', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🏠</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>Tenant Portal</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Linda Homes LLC</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#444', fontWeight: 500 }}>Hi, {tenant?.full_name?.split(' ')[0]}! 👋</div>
          <button onClick={signOut} style={{ background: 'transparent', color: '#666', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Welcome banner */}
        <div style={{ background: '#2D6A4F', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px', color: '#fff' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Welcome back, {tenant?.full_name?.split(' ')[0]}!</div>
          <div style={{ fontSize: '13px', opacity: 0.85 }}>📍 {tenant?.unit_address || tenant?.properties?.address}, {tenant?.properties?.city}, {tenant?.properties?.state}</div>
        </div>

        {/* Key stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Monthly Rent</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2D6A4F', fontFamily: 'Syne, sans-serif' }}>{fm(lease?.rent_amount)}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>Due day {lease?.due_day || 1} of each month</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Lease Ends</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: daysUntilExpiry && daysUntilExpiry <= 90 ? '#D97706' : '#1A1A1A', fontFamily: 'Syne, sans-serif' }}>{formatDate(lease?.end_date)}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>{daysUntilExpiry ? daysUntilExpiry + ' days remaining' : '—'}</div>
          </div>
        </div>

        {/* Next payment due */}
        {nextPayment && (
          <div style={{ background: '#FFF9ED', border: '1px solid #FCD34D', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>⏰ Payment Due</div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>{formatDate(nextPayment.due_date)}</div>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#92400E', fontFamily: 'Syne, sans-serif' }}>{fm(nextPayment.amount_due)}</div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '24px' }}>
          {[
            { icon: '💳', label: 'Payments', href: '/portal/payments' },
            { icon: '🔧', label: 'Maintenance', href: '/portal/maintenance' },
            { icon: '💬', label: 'Messages', href: '/portal/messages' },
            { icon: '📄', label: 'Documents', href: '/portal/documents' },
          ].map(item => (
            <a key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 12px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>{item.label}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Recent payments */}
        {payments.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>💳 Recent Payments</div>
              <a href='/portal/payments' style={{ fontSize: '12px', color: '#2D6A4F', textDecoration: 'none', fontWeight: 600 }}>View all →</a>
            </div>
            {payments.slice(0, 3).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A' }}>Due {formatDate(p.due_date)}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{p.payment_method?.replace('_', ' ') || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: p.status === 'paid' ? '#2D6A4F' : '#D97706' }}>{fm(p.amount_paid)}</div>
                  <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: p.status === 'paid' ? '#DCFCE7' : '#FEF3C7', color: p.status === 'paid' ? '#166534' : '#92400E', fontWeight: 600 }}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Open maintenance */}
        {maintenance.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>🔧 Maintenance Requests</div>
              <a href='/portal/maintenance' style={{ fontSize: '12px', color: '#2D6A4F', textDecoration: 'none', fontWeight: 600 }}>View all →</a>
            </div>
            {maintenance.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A' }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '1px', textTransform: 'capitalize' }}>{m.category?.replace('_', ' ')}</div>
                </div>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: m.status === 'completed' ? '#DCFCE7' : m.status === 'in_progress' ? '#EDE9FE' : '#FEF3C7', color: m.status === 'completed' ? '#166534' : m.status === 'in_progress' ? '#5B21B6' : '#92400E', fontWeight: 600, textTransform: 'capitalize' }}>{m.status?.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
