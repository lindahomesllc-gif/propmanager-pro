'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [propFilter, setPropFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('expenses').select('*, properties(address)').eq('user_id', USER_ID).order('expense_date', { ascending: false }),
      supabase.from('properties').select('id, address').eq('user_id', USER_ID),
    ]).then(([e, p]) => {
      setExpenses(e.data || [])
      setProperties(p.data || [])
      setLoading(false)
    })
  }, [])

  async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id).eq('user_id', USER_ID)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const filtered = expenses.filter(e => {
    if (filter !== 'all' && e.category !== filter) return false
    if (propFilter !== 'all' && e.property_id !== propFilter) return false
    return true
  })

  const thisYear = new Date().getFullYear().toString()
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const ytd = expenses.filter(e => e.expense_date?.startsWith(thisYear)).reduce((s, e) => s + e.amount, 0)
  const deductible = expenses.filter(e => e.is_deductible).reduce((s, e) => s + e.amount, 0)

  const catIcon = (c) => ({ mortgage: '🏦', property_tax: '🧾', insurance: '🛡', repairs_maintenance: '🔧', utilities: '⚡', management_fees: '👔', advertising: '📢', legal_professional: '⚖️', depreciation: '📉', supplies: '🛒', travel: '✈️', other: '📋' }[c] || '📋')
  const catColor = (c) => ({ mortgage: 'var(--blue)', property_tax: 'var(--red)', insurance: 'var(--amber)', repairs_maintenance: '#A78BFA', utilities: '#34D399', management_fees: '#F472B6', advertising: 'var(--blue)', other: 'var(--text2)' }[c] || 'var(--text2)')
  const categories = ['all','mortgage','property_tax','insurance','repairs_maintenance','utilities','management_fees','advertising','legal_professional','depreciation','supplies','travel','other']

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Expenses</div>
        <a href='/expenses/new' style={{ background: 'var(--green)', color: '#fff', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ Add Expense</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '💸 Total', value: fm(total), color: 'var(--red)' },
          { label: '📅 YTD', value: fm(ytd), color: 'var(--amber)' },
          { label: '✅ Deductible', value: fm(deductible), color: 'var(--green)' },
          { label: '📋 Records', value: filtered.length, color: 'var(--text)' },
        ].map((mc, i) => (
          <div key={mc.label} style={{ padding: '14px 20px', background: 'var(--bg2)', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0, flexWrap: 'wrap' }}>
        <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }}>
          <option value='all'>All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px', border: '0.5px solid var(--border2)', background: filter === c ? 'var(--green)' : 'transparent', color: filter === c ? '#fff' : 'var(--text2)', cursor: 'pointer', fontWeight: filter === c ? 700 : 400, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {c === 'all' ? 'All' : catIcon(c) + ' ' + c.replace(/_/g,' ')}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💰</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '16px' }}>No expenses yet</div>
            <a href='/expenses/new' style={{ background: 'var(--green)', color: '#fff', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ Add Expense</a>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filtered.map(e => (
              <div key={e.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + catColor(e.category), borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: catColor(e.category) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {catIcon(e.category)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{e.description || e.category?.replace(/_/g,' ')}</div>
                    <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: catColor(e.category) + '22', color: catColor(e.category), fontWeight: 600, textTransform: 'capitalize' }}>{e.category?.replace(/_/g,' ')}</span>
                    {e.is_deductible && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 600 }}>✓ Deductible</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{e.properties?.address || '—'}{e.vendor_name ? ' · ' + e.vendor_name : ''} · {formatDate(e.expense_date)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--red)' }}>{fm(e.amount)}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => deleteExpense(e.id)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}