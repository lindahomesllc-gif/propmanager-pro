'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, monthlyPI } from '@/lib/supabase'

// Owner / Partner statements: split an entity's income, expenses and cash flow
// among its partners by ownership %, for any year. Partners stored on entities.partners (jsonb).
export default function OwnersPage() {
  const [entities, setEntities] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [mortgages, setMortgages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [entityId, setEntityId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [partners, setPartners] = useState<any[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('entities').select('*').order('name'),
      supabase.from('properties').select('id, address, entity_id, owner_entity, ownership_percentage'),
      supabase.from('payments').select('property_id, amount_paid, paid_date, status'),
      supabase.from('expenses').select('property_id, amount, expense_date'),
      supabase.from('mortgages').select('property_id, original_amount, current_balance, interest_rate, term_years, interest_only, is_paid_off'),
    ]).then(([e, p, pay, ex, m]) => {
      const ents = e.data || []
      setEntities(ents)
      setProperties(p.data || [])
      setPayments(pay.data || [])
      setExpenses(ex.data || [])
      setMortgages(m.data || [])
      if (ents.length) { setEntityId(ents[0].id); setPartners(Array.isArray(ents[0].partners) ? ents[0].partners : []) }
      setLoading(false)
    })
  }, [])

  function selectEntity(id: string) {
    setEntityId(id); setEditing(false)
    const ent = entities.find(e => e.id === id)
    setPartners(Array.isArray(ent?.partners) ? ent.partners : [])
  }

  async function savePartners() {
    setSaving(true)
    const clean = partners.filter(p => p.name?.trim()).map(p => ({ name: p.name.trim(), pct: parseFloat(p.pct) || 0, email: p.email || '' }))
    const { error } = await supabase.from('entities').update({ partners: clean }).eq('id', entityId)
    setSaving(false)
    if (error) { alert('Could not save partners: ' + error.message + '\n\nMake sure you ran the entities.partners SQL.'); return }
    setPartners(clean); setEditing(false)
    setEntities(list => list.map(e => e.id === entityId ? { ...e, partners: clean } : e))
  }

  const entity = entities.find(e => e.id === entityId)
  const props = properties.filter(p => p.entity_id === entityId || (entity && p.owner_entity && p.owner_entity === entity.name))
  const pctOf = (p: any) => (p.ownership_percentage == null ? 100 : p.ownership_percentage) / 100
  const propPct: Record<string, number> = {}; props.forEach(p => { propPct[p.id] = pctOf(p) })
  const inSet = (pid: string) => pid in propPct
  const yStr = String(year)

  const income = payments.filter(p => p.status === 'paid' && p.paid_date?.startsWith(yStr) && inSet(p.property_id))
    .reduce((s, p) => s + (p.amount_paid || 0) * propPct[p.property_id], 0)
  const opex = expenses.filter(e => e.expense_date?.startsWith(yStr) && inSet(e.property_id))
    .reduce((s, e) => s + (e.amount || 0) * propPct[e.property_id], 0)
  const debt = mortgages.filter(m => !m.is_paid_off && inSet(m.property_id))
    .reduce((s, m) => s + monthlyPI(m) * 12 * propPct[m.property_id], 0)
  const noi = income - opex
  const netCash = noi - debt
  const totalPct = partners.reduce((s, p) => s + (parseFloat(p.pct) || 0), 0)

  const years = [0, 1, 2, 3].map(i => new Date().getFullYear() - i)
  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const panel = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }
  const secLabel = { fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }
  const line = (label: string, val: number, color = 'var(--text)', strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 16px', borderBottom: '0.5px solid var(--border)', fontSize: '13px', fontWeight: strong ? 700 : 400 }}>
      <span style={{ color: 'var(--text2)' }}>{label}</span><span style={{ color, fontWeight: strong ? 700 : 600 }}>{fm(val)}</span>
    </div>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🧾 Owner Statements</div>
        <button onClick={() => window.print()} className='btn btn-ghost no-print'>🖨 Print / Save PDF</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', maxWidth: '680px' }}>
          Split an entity&apos;s income, expenses and cash flow among its partners by ownership %. Define each entity&apos;s partners once, then print a statement for any partner and any year.
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: '14px' }}><div className='skeleton' style={{ height: '60px' }} /><div className='skeleton' style={{ height: '240px' }} /></div>
        ) : entities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏛️</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>No entities yet</div>
            <a href='/entities' className='btn btn-primary'>Add an entity</a>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <select value={entityId} onChange={e => selectEntity(e.target.value)} style={{ ...inp, width: 'auto', minWidth: '220px' }}>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...inp, width: 'auto' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Entity statement */}
              <div>
                <div style={secLabel}>{entity?.name} · {year}</div>
                <div style={panel}>
                  {line('Rent collected', income, 'var(--green)')}
                  {line('Operating expenses', -opex, 'var(--amber)')}
                  {line('Net operating income', noi, noi >= 0 ? 'var(--green)' : 'var(--red)', true)}
                  {line('Mortgage P&I (annual)', -debt, 'var(--red)')}
                  {line('Net cash flow', netCash, netCash >= 0 ? 'var(--green)' : 'var(--red)', true)}
                  <div style={{ padding: '9px 16px', fontSize: '11px', color: 'var(--text3)' }}>{props.length} propert{props.length === 1 ? 'y' : 'ies'} in this entity</div>
                </div>
              </div>

              {/* Partner split */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={secLabel}>Partner Distributions</div>
                  <button onClick={() => setEditing(v => !v)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '4px 10px' }}>{editing ? 'Done' : partners.length ? 'Edit partners' : '+ Add partners'}</button>
                </div>

                {editing ? (
                  <div style={{ ...panel, padding: '14px 16px' }}>
                    {partners.map((p, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1fr 28px', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                        <input style={inp} placeholder='Partner name' value={p.name || ''} onChange={e => setPartners(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                        <input style={inp} type='number' placeholder='%' value={p.pct ?? ''} onChange={e => setPartners(ps => ps.map((x, j) => j === i ? { ...x, pct: e.target.value } : x))} />
                        <input style={inp} placeholder='email (optional)' value={p.email || ''} onChange={e => setPartners(ps => ps.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
                        <button onClick={() => setPartners(ps => ps.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '17px', cursor: 'pointer' }}>×</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <button onClick={() => setPartners(ps => [...ps, { name: '', pct: '', email: '' }])} className='btn btn-ghost' style={{ fontSize: '12px' }}>+ Add partner</button>
                      <div style={{ fontSize: '11px', color: Math.abs(totalPct - 100) < 0.01 ? 'var(--green)' : 'var(--amber)' }}>Total: {totalPct}%{Math.abs(totalPct - 100) < 0.01 ? ' ✓' : ' (should be 100)'}</div>
                    </div>
                    <button onClick={savePartners} disabled={saving} className='btn btn-primary' style={{ marginTop: '12px', width: '100%' }}>{saving ? 'Saving…' : 'Save partners'}</button>
                  </div>
                ) : partners.length === 0 ? (
                  <div style={{ ...panel, padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>
                    No partners defined for {entity?.name}. Click <strong>+ Add partners</strong> to split this entity&apos;s income by ownership.
                  </div>
                ) : (
                  <div style={panel}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 50px 1fr 1fr', gap: '8px', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)' }}>
                      <div>Partner</div><div>Share</div><div style={{ textAlign: 'right' }}>NOI</div><div style={{ textAlign: 'right' }}>Net Cash</div>
                    </div>
                    {partners.map((p, i) => {
                      const f = (parseFloat(p.pct) || 0) / 100
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.3fr 50px 1fr 1fr', gap: '8px', padding: '11px 16px', borderBottom: '0.5px solid var(--border)', fontSize: '13px', alignItems: 'center' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            {p.email && <div style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</div>}
                          </div>
                          <div style={{ color: 'var(--text2)' }}>{p.pct}%</div>
                          <div style={{ textAlign: 'right', color: noi >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fm(noi * f)}</div>
                          <div style={{ textAlign: 'right', color: netCash >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fm(netCash * f)}</div>
                        </div>
                      )
                    })}
                    {Math.abs(totalPct - 100) > 0.01 && <div style={{ padding: '9px 16px', fontSize: '11px', color: 'var(--amber)' }}>⚠ Ownership totals {totalPct}% — should be 100%.</div>}
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6, maxWidth: '680px', marginTop: '20px' }}>
              <strong>How this is figured:</strong> income is rent actually collected in {year} for this entity&apos;s properties; expenses are what was logged that year; mortgage P&amp;I is annualized. Each is multiplied by the property&apos;s ownership % (for partly-owned properties), then split among partners by their share. These are management estimates for distributions/planning — not a substitute for your CPA&apos;s K-1.
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
