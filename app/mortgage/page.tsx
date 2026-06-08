'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate, loanTypeLabel } from '@/lib/supabase'
import AmortizationModal from '@/components/AmortizationModal'
import MortgageFormModal from '@/components/MortgageFormModal'

export default function MortgagePage() {
  const [mortgages, setMortgages] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduleFor, setScheduleFor] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('mortgages').select('*, properties(address, city, state)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, address'),
    ]).then(([m, p]) => {
      setMortgages(m.data || [])
      setProperties(p.data || [])
      setLoading(false)
    })
  }, [])

  function handleSaved(row: any, isEdit: boolean) {
    setMortgages(prev => isEdit ? prev.map(x => x.id === row.id ? row : x) : [row, ...prev])
    setShowForm(false)
  }
  async function delMortgage(m: any) {
    if (!confirm('Delete this mortgage' + (m.properties?.address ? ' for ' + m.properties.address : '') + '? This cannot be undone.')) return
    const { error: err } = await supabase.from('mortgages').delete().eq('id', m.id)
    if (err) { alert('Error: ' + err.message); return }
    setMortgages(prev => prev.filter(x => x.id !== m.id))
  }

  const totalBalance = mortgages.filter(m => !m.is_paid_off).reduce((s, m) => s + (m.current_balance || 0), 0)
  const totalPayment = mortgages.filter(m => !m.is_paid_off).reduce((s, m) => s + (m.monthly_payment || 0), 0)
  const totalOriginal = mortgages.reduce((s, m) => s + (m.original_amount || 0), 0)
  const totalPaidDown = totalOriginal - totalBalance

  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Mortgages</div>
        <button className='btn btn-primary' onClick={() => { setEditing(null); setShowForm(true) }}>+ Add Mortgage</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Balance', value: fm(totalBalance), color: 'var(--red)' },
            { label: 'Monthly Payments', value: fm(totalPayment), color: 'var(--amber)' },
            { label: 'Original Loans', value: fm(totalOriginal), color: 'var(--text)' },
            { label: 'Paid Down', value: fm(totalPaidDown), color: 'var(--green)' },
            { label: 'Active Mortgages', value: mortgages.filter(m => !m.is_paid_off).length, color: 'var(--blue)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && mortgages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏦</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>No mortgages yet</div>
            <button className='btn btn-primary' onClick={() => { setEditing(null); setShowForm(true) }}>+ Add Mortgage</button>
          </div>
        )}
        {!loading && mortgages.map(m => (
          <div key={m.id} style={{ ...card, borderLeft: m.is_paid_off ? '3px solid var(--green)' : '3px solid var(--blue)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{m.properties?.address}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{m.lender_name || 'No lender'} {m.loan_number ? '· #' + m.loan_number : ''}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{loanTypeLabel(m.loan_type)} · {m.term_years}yr · {m.interest_rate}%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: m.is_paid_off ? 'var(--green)' : 'var(--red)' }}>{fm(m.current_balance)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>current balance</div>
                {m.is_paid_off && <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>✓ PAID OFF</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                ['Original', fm(m.original_amount)],
                ['Monthly', fm(m.monthly_payment)],
                ['Paid Down', fm((m.original_amount || 0) - (m.current_balance || 0))],
                ['Started', formatDate(m.start_date)],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => setScheduleFor(m)} className='btn btn-ghost' style={{ fontSize: '12px' }}>📅 Amortization Schedule</button>
              <button onClick={() => { setEditing(m); setShowForm(true) }} className='btn btn-ghost' style={{ fontSize: '12px' }}>Edit</button>
              <button onClick={() => delMortgage(m)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && <MortgageFormModal mortgage={editing} properties={properties} onClose={() => setShowForm(false)} onSaved={handleSaved} />}
      {scheduleFor && <AmortizationModal mortgage={scheduleFor} onClose={() => setScheduleFor(null)} />}
    </AppShell>
  )
}
