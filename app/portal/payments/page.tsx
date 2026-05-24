'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export default function TenantPayments() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: t } = await supabase.from('tenants').select('*').eq('email', user.email).eq('status', 'active').single()
      if () { router.push('/portal'); return }
      const { data: p } = await supabase.from('payments').select('*').eq('tenant_id', t.id).order('due_date', { ascending: false })
      setPayments(p || [])
      setLoading(false)
    }
    load()
  }, [])
  const fm = (n) => n ? '$' + Number(n).toLocaleString() : '—'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0)
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading...</div>
  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F3', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a href='/portal/dashboard' style={{ color: '#2D6A4F', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← Back</a>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>💳 Payment History</div>
      </div>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>Total Paid</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2D6A4F', fontFamily: 'Syne, sans-serif' }}>{fm(totalPaid)}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>Total Payments</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1A1A1A', fontFamily: 'Syne, sans-serif' }}>{payments.length}</div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          {payments.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No payment history yet.</div>
          : payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>Due {formatDate(p.due_date)}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{p.payment_method || '—'}{p.paid_date ? ' · Paid ' + formatDate(p.paid_date) : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: p.status === 'paid' ? '#2D6A4F' : '#D97706' }}>{fm(p.amount_paid)}</div>
                <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: p.status === 'paid' ? '#DCFCE7' : '#FEF3C7', color: p.status === 'paid' ? '#166534' : '#92400E', fontWeight: 600 }}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}