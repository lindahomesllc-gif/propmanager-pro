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

  const filtered = expenses.filter(e => {
    if (filter !== 'all' && e.category !== filter) return false
    if (propFilter !== 'all' && e.property_id !== propFilter) return false
    return true
  })

  const total = filtered.reduce((s, e) => s + e.amount, 0)
  const deductible = filtered.filter(e => e.is_deductible).reduce((s, e) => s + e.amount, 0)
  const thisYear = filtered.filter(e => e.expense_date?.startsWith(new Date().getFullYear().toString()))
  const ytd = thisYear.reduce((s, e) => s + e.amount, 0)

  const categories = ['all','mortgage','property_tax','insurance','repairs_maintenance','utilities','management_fees','advertising','legal_professional','depreciation','supplies','travel','other']

  const catColor = (c) => ({
    mortgage: '#60A5FA',
    property_tax: '#F87171',
    insurance: '#FBB040',
    repairs_maintenance: '#A78BFA',
    utilities: '#34D399',
    management_fees: '#F472B6',
    other: '#A8A69E',
  }[c] || '#A8A69E')

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Expenses</div>
        <a href='/expenses/new' style={{ background: '#4ADE9A', color: '#0E0E0C', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>+ Add Expense</a>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Expenses', value: fm(total), color: '#F87171' },
            { label: 'YTD Expenses', value: fm(ytd), color: '#FBB040' },
            { label: 'Tax Deductible', value: fm(deductible), color: '#4ADE9A' },
            { label: 'Non-Deductible', value: fm(total - deductible), color: '#A8A69E' },
            { label: 'Total Records', value: filtered.length, color: '#F0EEE8' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', outline: 'none' }}>
            <option value='all'>All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', outline: 'none' }}>
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading expenses...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💰</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#A8A69E', marginBottom: '6px' }}>No expenses yet</div>
            <a href='/expenses/new' style={{ background: '#4ADE9A', color: '#0E0E0C', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ Add Expense</a>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  {['Date', 'Property', 'Category', 'Vendor', 'Amount', 'Deductible'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5A5A56', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#A8A69E' }}>{formatDate(e.expense_date)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#F0EEE8' }}>{e.properties?.address || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: catColor(e.category) + '22', color: catColor(e.category), textTransform: 'capitalize' }}>{e.category?.replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#A8A69E' }}>{e.vendor_name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#F87171', fontFamily: 'Syne, sans-serif' }}>{fm(e.amount)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '11px', color: e.is_deductible ? '#4ADE9A' : '#F87171' }}>{e.is_deductible ? '✓ Yes' : '✗ No'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}