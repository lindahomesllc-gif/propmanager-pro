'use client'
import { useState, useMemo } from 'react'
import { fm } from '@/lib/supabase'

type Row = { n: number; date: Date | null; payment: number; principal: number; interest: number; balance: number }

function buildSchedule(m: any): { rows: Row[]; valid: boolean; reason?: string; totalInterest: number; totalPaid: number; piPayment: number; interestOnly: boolean } {
  const P = Number(m.original_amount) || 0
  const r = (Number(m.interest_rate) || 0) / 100 / 12
  const n = Math.round((Number(m.term_years) || 0) * 12)
  const start = m.start_date ? new Date(m.start_date + 'T00:00:00') : null
  if (P <= 0 || n <= 0) return { rows: [], valid: false, reason: 'This loan is missing its amount, rate, or term — fill those in to see the schedule.', totalInterest: 0, totalPaid: 0, piPayment: 0, interestOnly: !!m.interest_only }

  // Interest-only: every payment is just interest, the balance stays flat, and the
  // full principal comes due as a balloon on the final payment. No amortization.
  if (m.interest_only) {
    const intPay = P * r
    const rows: Row[] = []
    let totalInterest = 0, totalPaid = 0
    for (let i = 1; i <= n; i++) {
      const isLast = i === n
      const principal = isLast ? P : 0          // balloon principal on the final payment
      const payment = intPay + principal
      totalInterest += intPay; totalPaid += payment
      let date: Date | null = null
      if (start) { date = new Date(start); date.setMonth(date.getMonth() + (i - 1)) }
      rows.push({ n: i, date, payment, principal, interest: intPay, balance: isLast ? 0 : P })
    }
    return { rows, valid: true, totalInterest, totalPaid, piPayment: intPay, interestOnly: true }
  }

  // Compute the true principal & interest payment from the loan terms. We do NOT
  // use the stored "monthly payment" because that often includes escrow
  // (taxes + insurance), which doesn't pay down the loan. This keeps the schedule
  // correct and guarantees it amortizes to exactly $0 at the final payment.
  const pay = r > 0 ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n

  const rows: Row[] = []
  let bal = P
  let totalInterest = 0, totalPaid = 0
  for (let i = 1; i <= n && bal > 0.005; i++) {
    const interest = bal * r
    let principal = pay - interest
    let thisPay = pay
    if (principal >= bal || i === n) { principal = bal; thisPay = bal + interest } // clear the loan exactly on the final/last payment
    bal = Math.max(0, bal - principal)
    totalInterest += interest
    totalPaid += thisPay
    let date: Date | null = null
    if (start) { date = new Date(start); date.setMonth(date.getMonth() + (i - 1)) }
    rows.push({ n: i, date, payment: thisPay, principal, interest, balance: bal })
  }
  return { rows, valid: true, totalInterest, totalPaid, piPayment: pay, interestOnly: false }
}

const fmtDate = (d: Date | null) => d ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'

export default function AmortizationModal({ mortgage, onClose }: { mortgage: any; onClose: () => void }) {
  const [view, setView] = useState<'monthly' | 'yearly'>('monthly')
  const { rows, valid, reason, totalInterest, totalPaid, piPayment, interestOnly } = useMemo(() => buildSchedule(mortgage), [mortgage])
  const escrow = (Number(mortgage.monthly_payment) || 0) - piPayment

  // yearly rollup (12-payment blocks)
  const yearly = useMemo(() => {
    const groups: { year: number; label: string; paid: number; principal: number; interest: number; balance: number }[] = []
    rows.forEach(r => {
      const y = Math.ceil(r.n / 12)
      let g = groups[y - 1]
      if (!g) { g = { year: y, label: r.date ? String(r.date.getFullYear()) : 'Year ' + y, paid: 0, principal: 0, interest: 0, balance: 0 }; groups[y - 1] = g }
      g.paid += r.payment; g.principal += r.principal; g.interest += r.interest; g.balance = r.balance
    })
    return groups
  }, [rows])

  function exportCSV() {
    const head = 'Payment #,Date,Payment,Principal,Interest,Remaining Balance'
    const lines = rows.map(r => [r.n, fmtDate(r.date), r.payment.toFixed(2), r.principal.toFixed(2), r.interest.toFixed(2), r.balance.toFixed(2)].join(','))
    const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'amortization-' + (mortgage.properties?.address || 'loan').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const th: any = { padding: '8px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', position: 'sticky', top: 0, background: 'var(--bg2)', textAlign: 'right' }
  const thL: any = { ...th, textAlign: 'left' }
  const td: any = { padding: '7px 12px', fontSize: '12px', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }
  const tdL: any = { ...td, textAlign: 'left', color: 'var(--text2)' }
  const payoff = rows.length ? rows[rows.length - 1].date : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={onClose}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '14px', width: '760px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 22px 14px', borderBottom: '0.5px solid var(--border)' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>📅 Amortization Schedule</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{mortgage.properties?.address || 'Loan'} · {mortgage.lender_name || 'No lender'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {!valid ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px', lineHeight: 1.6 }}>⚠️ {reason}</div>
        ) : (
          <>
            {/* summary band */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0', borderBottom: '0.5px solid var(--border)' }}>
              {[
                ['Loan Amount', fm(mortgage.original_amount)],
                ['Rate', (mortgage.interest_rate || 0) + '%'],
                [interestOnly ? 'Interest Payment' : 'P&I Payment', fm(piPayment)],
                [interestOnly ? 'Balloon Due' : 'Payoff', fmtDate(payoff)],
                ['Total Interest', fm(totalInterest)],
              ].map(([k, v], i) => (
                <div key={k as string} style={{ padding: '12px 16px', borderRight: i < 4 ? '0.5px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{k}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: k === 'Total Interest' ? 'var(--red)' : 'var(--text)', marginTop: '3px' }}>{v}</div>
                </div>
              ))}
            </div>
            {interestOnly && (
              <div style={{ padding: '9px 16px', fontSize: '11.5px', color: 'var(--amber)', borderBottom: '0.5px solid var(--border)', background: 'var(--amber-bg)' }}>
                🎈 <strong>Interest-only</strong> — the balance never pays down. You pay {fm(piPayment)}/mo in interest, then the full <strong>{fm(mortgage.original_amount)}</strong> is due as a balloon on {fmtDate(payoff)}. Plan to refinance or sell before then.
              </div>
            )}
            {escrow > 1 && !interestOnly && (
              <div style={{ padding: '9px 16px', fontSize: '11.5px', color: 'var(--text3)', borderBottom: '0.5px solid var(--border)', background: 'var(--bg3)' }}>
                Your recorded payment of <strong style={{ color: 'var(--text2)' }}>{fm(mortgage.monthly_payment)}/mo</strong> includes about <strong style={{ color: 'var(--text2)' }}>{fm(escrow)}/mo</strong> in escrow (taxes &amp; insurance). The schedule below is <strong style={{ color: 'var(--text2)' }}>principal &amp; interest only</strong> — that's what pays the loan down.
              </div>
            )}

            {/* controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '8px', padding: '3px', border: '0.5px solid var(--border)' }}>
                {(['monthly', 'yearly'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: view === v ? 'var(--bg2)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontWeight: view === v ? 600 : 400, textTransform: 'capitalize' }}>{v}</button>
                ))}
              </div>
              <button onClick={exportCSV} className='btn btn-ghost' style={{ fontSize: '12px', padding: '6px 12px' }}>⬇ Export CSV</button>
            </div>

            {/* table */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {view === 'monthly' ? (
                  <>
                    <thead><tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                      <th style={thL}>#</th><th style={thL}>Date</th><th style={th}>Payment</th><th style={th}>Principal</th><th style={th}>Interest</th><th style={th}>Balance</th>
                    </tr></thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.n} style={{ borderBottom: '0.5px solid var(--border)' }}>
                          <td style={tdL}>{r.n}</td>
                          <td style={tdL}>{fmtDate(r.date)}</td>
                          <td style={td}>{fm(r.payment)}</td>
                          <td style={{ ...td, color: 'var(--green)' }}>{fm(r.principal)}</td>
                          <td style={{ ...td, color: 'var(--red)' }}>{fm(r.interest)}</td>
                          <td style={{ ...td, fontWeight: 600 }}>{fm(r.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead><tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                      <th style={thL}>Year</th><th style={th}>Paid</th><th style={th}>Principal</th><th style={th}>Interest</th><th style={th}>End Balance</th>
                    </tr></thead>
                    <tbody>
                      {yearly.map(g => (
                        <tr key={g.year} style={{ borderBottom: '0.5px solid var(--border)' }}>
                          <td style={tdL}>{g.label}</td>
                          <td style={td}>{fm(g.paid)}</td>
                          <td style={{ ...td, color: 'var(--green)' }}>{fm(g.principal)}</td>
                          <td style={{ ...td, color: 'var(--red)' }}>{fm(g.interest)}</td>
                          <td style={{ ...td, fontWeight: 600 }}>{fm(g.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
