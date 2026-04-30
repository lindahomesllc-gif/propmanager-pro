'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { getPayments, fm, formatDate, type Payment } from '@/lib/supabase'

const USER_ID = 'cacb3a74-75d7-4e07-af71-6db4fdde9a92'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPayments(USER_ID).then(data => { setPayments(data); setLoading(false) })
  }, [])

  const due  = payments.filter(p => p.status === 'due' || p.status === 'upcoming')
  const paid = payments.filter(p => p.status === 'paid')
  const late = payments.filter(p => p.status === 'late')

  const statusChip = (s: string) => {
    if (s === 'paid')    return <span className="chip chip-g">Paid</span>
    if (s === 'due')     return <span className="chip chip-a">Due</span>
    if (s === 'late')    return <span className="chip chip-r">Late</span>
    if (s === 'partial') return <span className="chip chip-b">Partial</span>
    return <span className="chip chip-x">{s}</span>
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Rent Payments</div>
        <a href="/payments/new" className="btn btn-primary" style={{ fontSize: '11px' }}>+ Record Payment</a>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Outstanding',     value: fm(due.reduce((s,p)=>s+p.amount_due,0)),  color: '#FBB040' },
            { label: 'Collected YTD',   value: fm(paid.reduce((s,p)=>s+p.amount_paid,0)), color: '#4ADE9A' },
            { label: 'Payments Due',    value: due.length.toString(),                     color: '#FBB040' },
            { label: 'Late Payments',   value: late.length.toString(),                    color: late.length>0?'#F87171':'#4ADE9A' },
            { label: 'Collection Rate', value: payments.length > 0 ? Math.round(paid.length/Math.max(paid.length+due.length,1)*100)+'%' : '—', color: '#4ADE9A' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px', borderTop: `2px solid ${mc.color}` }}>
              <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading payments…</div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56', fontSize: '13px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💳</div>
            No payments recorded yet.
            <div style={{ marginTop: '12px' }}>
              <a href="/payments/new" className="btn btn-primary">Record First Payment</a>
            </div>
          </div>
        ) : (
          <>
            {due.length > 0 && (
              <>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#A8A69E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Due Now</div>
                {due.map(p => (
                  <div key={p.id} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #FBB040', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8' }}>Rent Payment</div>
                        <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>Due {formatDate(p.due_date)}</div>
                      </div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: '#FBB040' }}>{fm(p.amount_due)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary" style={{ fontSize: '11px' }} onClick={() => alert('Payment collection — connect Stripe to process real payments!')}>💳 Collect Payment</button>
                      <button className="btn btn-ghost"   style={{ fontSize: '11px' }}>📨 Send Reminder</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ fontSize: '12px', fontWeight: 700, color: '#A8A69E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', marginTop: '16px' }}>Payment History</div>
            <div className="card">
              <table className="tbl">
                <thead><tr><th>Date</th><th>Due Date</th><th>Amount Due</th><th>Amount Paid</th><th>Method</th><th>Status</th></tr></thead>
                <tbody>
                  {paid.map(p => (
                    <tr key={p.id}>
                      <td>{formatDate(p.paid_date)}</td>
                      <td>{formatDate(p.due_date)}</td>
                      <td>{fm(p.amount_due)}</td>
                      <td style={{ color: '#4ADE9A', fontWeight: 600 }}>{fm(p.amount_paid)}</td>
                      <td><span className="chip chip-x">{p.payment_method || '—'}</span></td>
                      <td>{statusChip(p.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
