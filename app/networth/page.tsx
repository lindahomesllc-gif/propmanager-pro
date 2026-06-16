'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, monthlyPI, loanBalance } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

// Consolidated net worth across all entities + a forward cash-flow forecast.
export default function NetWorthPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [mortgages, setMortgages] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [horizon, setHorizon] = useState(12)
  const [startCash, setStartCash] = useState('0')

  useEffect(() => {
    Promise.all([
      supabase.from('properties').select('id, address, market_value, purchase_price, entity_id, owner_entity, ownership_percentage'),
      supabase.from('entities').select('id, name'),
      supabase.from('mortgages').select('*').eq('is_paid_off', false),
      supabase.from('leases').select('property_id, rent_amount, status').eq('status', 'executed'),
      supabase.from('expenses').select('property_id, amount, expense_date'),
    ]).then(([p, en, m, l, e]) => {
      setProperties(p.data || []); setEntities(en.data || []); setMortgages(m.data || [])
      setLeases(l.data || []); setExpenses(e.data || [])
      setLoading(false)
    })
  }, [])

  const pct = (p: any) => (p.ownership_percentage == null ? 100 : p.ownership_percentage) / 100
  const pctOf: Record<string, number> = {}; properties.forEach(p => { pctOf[p.id] = pct(p) })
  const debtForProp = (pid: string) => mortgages.filter(m => m.property_id === pid).reduce((s, m) => s + loanBalance(m), 0)
  const piForProp = (pid: string) => mortgages.filter(m => m.property_id === pid).reduce((s, m) => s + monthlyPI(m), 0)

  const assets = properties.reduce((s, p) => s + (p.market_value || 0) * pctOf[p.id], 0)
  const liabilities = properties.reduce((s, p) => s + debtForProp(p.id) * pctOf[p.id], 0)
  const netWorth = assets - liabilities

  // group by entity for the balance sheet
  const groups: Record<string, { name: string; value: number; debt: number; count: number }> = {}
  properties.forEach(p => {
    const ent = entities.find(e => e.id === p.entity_id)
    const key = ent?.id || p.owner_entity || '__self'
    const name = ent?.name || p.owner_entity || 'Self / Unassigned'
    if (!groups[key]) groups[key] = { name, value: 0, debt: 0, count: 0 }
    groups[key].value += (p.market_value || 0) * pctOf[p.id]
    groups[key].debt += debtForProp(p.id) * pctOf[p.id]
    groups[key].count += 1
  })
  const groupRows = Object.values(groups).sort((a, b) => (b.value - b.debt) - (a.value - a.debt))

  // forward cash flow (your economic share)
  const monthlyRent = leases.reduce((s, l) => s + (l.rent_amount || 0) * (pctOf[l.property_id] ?? 1), 0)
  const now = new Date()
  const cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10)
  const trailingExp = expenses.filter(e => e.expense_date && e.expense_date >= cutoff).reduce((s, e) => s + (e.amount || 0) * (pctOf[e.property_id] ?? 1), 0)
  const monthlyOpex = trailingExp / 12
  const monthlyDebt = properties.reduce((s, p) => s + piForProp(p.id) * pctOf[p.id], 0)
  const monthlyNet = monthlyRent - monthlyOpex - monthlyDebt

  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const start = parseFloat(startCash) || 0
  const forecast = Array.from({ length: horizon }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
    return { month: MO[d.getMonth()] + (d.getMonth() === 0 || i === 0 ? " '" + String(d.getFullYear()).slice(2) : ''), balance: Math.round(start + monthlyNet * (i + 1)) }
  })
  const runway = monthlyNet < 0 && start > 0 ? Math.floor(start / -monthlyNet) : null

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const panel = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }
  const secLabel = { fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }
  const tile = (l: string, v: string, c = 'var(--text)', sub = '') => (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={lbl}>{l}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: c, marginTop: '4px' }}>{v}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>{sub}</div>}
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🏦 Net Worth &amp; Forecast</div>
        <button onClick={() => window.print()} className='btn btn-ghost no-print'>🖨 PDF</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'grid', gap: '14px' }}><div className='skeleton' style={{ height: '80px' }} /><div className='skeleton' style={{ height: '220px' }} /></div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text3)' }}>Add properties to see your net worth.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '10px', marginBottom: '22px' }}>
              {tile('Net Worth', fm(netWorth), 'var(--green)', 'assets − liabilities')}
              {tile('Assets', fm(assets), 'var(--text)', properties.length + ' properties')}
              {tile('Liabilities', fm(liabilities), 'var(--red)', 'mortgage balances')}
              {tile('Monthly Cash Flow', fm(monthlyNet), monthlyNet >= 0 ? 'var(--green)' : 'var(--red)', fm(monthlyNet * 12) + '/yr')}
            </div>

            {/* Balance sheet by entity */}
            <div style={secLabel}>Net Worth by Entity</div>
            <div className='nw-balance' style={{ ...panel, marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 70px 1fr 1fr 1fr', gap: '10px', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)' }}>
                <div>Entity</div><div>Props</div><div style={{ textAlign: 'right' }}>Value</div><div style={{ textAlign: 'right' }}>Debt</div><div style={{ textAlign: 'right' }}>Equity</div>
              </div>
              {groupRows.map((g, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 70px 1fr 1fr 1fr', gap: '10px', padding: '11px 16px', borderBottom: '0.5px solid var(--border)', alignItems: 'center', fontSize: '13px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🏛️ {g.name}</div>
                  <div style={{ color: 'var(--text2)' }}>{g.count}</div>
                  <div style={{ textAlign: 'right', color: 'var(--text)' }}>{fm(g.value)}</div>
                  <div style={{ textAlign: 'right', color: 'var(--red)' }}>{fm(g.debt)}</div>
                  <div style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 700 }}>{fm(g.value - g.debt)}</div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 70px 1fr 1fr 1fr', gap: '10px', padding: '12px 16px', alignItems: 'center', fontSize: '13px', background: 'var(--bg3)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>Total</div>
                <div style={{ color: 'var(--text2)' }}>{properties.length}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{fm(assets)}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{fm(liabilities)}</div>
                <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--green)' }}>{fm(netWorth)}</div>
              </div>
            </div>

            {/* Cash-flow forecast */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
              <div style={secLabel as any}>Cash-Flow Forecast</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Starting cash</span>
                <input style={{ ...inp, width: '110px' }} type='number' value={startCash} onChange={e => setStartCash(e.target.value)} />
                {[12, 24].map(h => (
                  <button key={h} onClick={() => setHorizon(h)} style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '7px', border: '0.5px solid var(--border2)', background: horizon === h ? 'var(--green)' : 'transparent', color: horizon === h ? '#fff' : 'var(--text2)', cursor: 'pointer', fontWeight: horizon === h ? 700 : 400 }}>{h}mo</button>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '10px', marginBottom: '14px' }}>
                <div><div style={lbl}>Rent (monthly)</div><div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>{fm(monthlyRent)}</div></div>
                <div><div style={lbl}>Avg Expenses</div><div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--amber)', fontFamily: 'Syne, sans-serif' }}>−{fm(monthlyOpex)}</div></div>
                <div><div style={lbl}>Debt (P&I)</div><div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--red)', fontFamily: 'Syne, sans-serif' }}>−{fm(monthlyDebt)}</div></div>
                <div><div style={lbl}>Net / month</div><div style={{ fontSize: '15px', fontWeight: 700, color: monthlyNet >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'Syne, sans-serif' }}>{fm(monthlyNet)}</div></div>
              </div>
              {runway != null && (
                <div style={{ fontSize: '12px', color: 'var(--red)', marginBottom: '10px', fontWeight: 600 }}>⚠ At this burn, starting cash lasts ~{runway} month{runway === 1 ? '' : 's'}.</div>
              )}
              <ResponsiveContainer width='100%' height={200}>
                <BarChart data={forecast} barCategoryGap='22%'>
                  <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='3 3' />
                  <XAxis dataKey='month' tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} interval={horizon > 12 ? 1 : 0} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v)} />
                  <Tooltip contentStyle={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} formatter={(v: any) => [fm(v), 'Projected cash']} />
                  <ReferenceLine y={0} stroke='var(--text3)' />
                  <Bar dataKey='balance' radius={[3, 3, 0, 0]} fill={monthlyNet >= 0 ? 'var(--green)' : 'var(--red)'} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>Projected cumulative cash = starting cash + net each month, held flat. Assumes leases renew at current rent; expenses are your trailing-12-month average.</div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6, maxWidth: '700px' }}>
              Values use each property&apos;s ownership % (your economic share). Liabilities are current mortgage balances; debt service is P&amp;I only. A planning view — not a substitute for your books.
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
