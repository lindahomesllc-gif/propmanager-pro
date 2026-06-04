'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const fmtMoney = (n: any) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function PaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/portal'); return }
      const { data: t } = await supabase.from('tenants').select('*').eq('email', user.email).eq('status', 'active').single()
      if (!t) { router.push('/portal'); return }
      const { data: p } = await supabase.from('payments').select('*').eq('tenant_id', t.id).order('due_date', { ascending: false })
      setPayments(p || [])
      setLoading(false)
    }
    load()
  }, [])

  const statusColor = (s: string) => ({ paid: '#2D6A4F', late: '#DC2626', due: '#D97706', upcoming: '#D97706' }[s] || '#6B7280')
  const statusBg = (s: string) => ({ paid: '#DCFCE7', late: '#FEE2E2', due: '#FEF3C7', upcoming: '#FEF3C7' }[s] || '#F3F4F6')

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount_paid || 0), 0)
  const nextDue = payments.filter(p => p.status !== 'paid').sort((a, b) => +new Date(a.due_date) - +new Date(b.due_date))[0]

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F3', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a href='/portal/dashboard' style={{ color: '#2D6A4F', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← Back</a>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>💳 My Payments</div>
      </div>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px' }}>
        {loading ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {[0, 1, 2].map(i => <div key={i} style={{ height: '74px', borderRadius: '12px', background: '#ECEFEA' }} />)}
          </div>
        ) : (
          <>
            {nextDue && (
              <div style={{ background: '#2D6A4F', borderRadius: '14px', padding: '20px 22px', marginBottom: '20px', color: '#fff' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>Next Payment Due</div>
                <div style={{ fontSize: '30px', fontWeight: 800, fontFamily: 'Syne, sans-serif', margin: '6px 0 2px' }}>{fmtMoney(nextDue.amount_due)}</div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>Due {fmtDate(nextDue.due_date)}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>Total Paid</div>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#2D6A4F', marginTop: '4px' }}>{fmtMoney(totalPaid)}</div>
              </div>
              <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>Records</div>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#1A1A1A', marginTop: '4px' }}>{payments.length}</div>
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Payment History</div>
            {payments.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A' }}>No payments on record</div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>You're all caught up.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {payments.map(p => (
                  <div key={p.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>{fmtMoney(p.status === 'paid' ? p.amount_paid : p.amount_due)}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Due {fmtDate(p.due_date)}{p.paid_date ? ' · Paid ' + fmtDate(p.paid_date) : ''}</div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', background: statusBg(p.status), color: statusColor(p.status), fontWeight: 700, textTransform: 'capitalize' }}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
