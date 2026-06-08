'use client'
import { useEffect, useState } from 'react'
import { supabase, fm } from '@/lib/supabase'

// Vision-board goals: persisted per-user targets with live progress bars.
type Current = { cashFlow: number; value: number; properties: number; occupancy: number }

const DEFS = [
  { key: 'target_cash_flow', label: 'Monthly Cash Flow', cur: 'cashFlow', kind: 'money' },
  { key: 'target_value', label: 'Portfolio Value', cur: 'value', kind: 'money' },
  { key: 'target_properties', label: 'Properties', cur: 'properties', kind: 'count' },
  { key: 'target_occupancy', label: 'Occupancy', cur: 'occupancy', kind: 'pct' },
] as const

const fmtVal = (v: number, kind: string) => kind === 'money' ? fm(v) : kind === 'pct' ? Math.round(v) + '%' : String(Math.round(v))

export default function GoalsCard({ current }: { current: Current }) {
  const [goals, setGoals] = useState<any>(null)
  const [uid, setUid] = useState('')
  const [customGoals, setCustomGoals] = useState<any[]>([])
  const [newGoal, setNewGoal] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGoals({}); return }
    setUid(user.id)
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).maybeSingle()
    const g = data || {}
    setGoals(g)
    setCustomGoals(Array.isArray(g.custom_goals) ? g.custom_goals : [])
    setForm({
      target_cash_flow: g.target_cash_flow ?? '', target_value: g.target_value ?? '',
      target_properties: g.target_properties ?? '', target_occupancy: g.target_occupancy ?? '',
    })
  }
  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    const payload: any = {
      user_id: uid,
      target_cash_flow: form.target_cash_flow !== '' ? parseFloat(form.target_cash_flow) : null,
      target_value: form.target_value !== '' ? parseFloat(form.target_value) : null,
      target_properties: form.target_properties !== '' ? parseInt(form.target_properties) : null,
      target_occupancy: form.target_occupancy !== '' ? parseFloat(form.target_occupancy) : null,
      custom_goals: customGoals,
    }
    const { error } = await supabase.from('goals').upsert(payload, { onConflict: 'user_id' })
    setSaving(false)
    if (error) { alert('Could not save goals: ' + error.message); return }
    setGoals(payload); setEditing(false)
  }
  async function toggleCustom(i: number) {
    const next = customGoals.map((c, idx) => idx === i ? { ...c, done: !c.done } : c)
    setCustomGoals(next)
    await supabase.from('goals').upsert({ user_id: uid, custom_goals: next }, { onConflict: 'user_id' })
  }
  function addGoal() { if (newGoal.trim()) { setCustomGoals([...customGoals, { text: newGoal.trim(), done: false }]); setNewGoal('') } }
  function removeGoal(i: number) { setCustomGoals(customGoals.filter((_, idx) => idx !== i)) }

  if (goals === null) return null
  const setGoals2 = DEFS.filter(d => goals[d.key] != null && Number(goals[d.key]) > 0)
  const curOf = (d: any) => (current as any)[d.cur] || 0
  const hasAny = setGoals2.length > 0 || customGoals.length > 0

  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }

  return (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--green)', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasAny ? '14px' : '0' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>🎯 Goals</div>
        <button onClick={() => setEditing(true)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>{hasAny ? 'Edit goals' : '+ Set goals'}</button>
      </div>

      {!hasAny && (
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>Set a few targets — or write your own goals — and track them every time you open the app.</div>
      )}

      {setGoals2.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '16px' }}>
          {setGoals2.map(d => {
            const target = Number(goals[d.key])
            const cur = curOf(d)
            const pct = target > 0 ? Math.min(100, Math.round((cur / target) * 100)) : 0
            const done = pct >= 100
            return (
              <div key={d.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)' }}>{d.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{fmtVal(cur, d.kind)} <span style={{ color: 'var(--text3)' }}>/ {fmtVal(target, d.kind)}</span></span>
                </div>
                <div style={{ height: '7px', background: 'var(--bg3)', borderRadius: '20px', overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: done ? 'var(--green)' : 'var(--amber)', borderRadius: '20px', transition: 'width 0.4s' }} />
                </div>
                <div style={{ fontSize: '10px', color: done ? 'var(--green)' : 'var(--text3)', marginTop: '3px', fontWeight: done ? 700 : 400 }}>{done ? '✓ Reached' : pct + '% there'}</div>
              </div>
            )
          })}
        </div>
      )}

      {customGoals.length > 0 && (
        <div style={{ marginTop: setGoals2.length > 0 ? '16px' : '0', borderTop: setGoals2.length > 0 ? '0.5px solid var(--border)' : 'none', paddingTop: setGoals2.length > 0 ? '14px' : '0', display: 'grid', gap: '9px' }}>
          {customGoals.map((c: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => toggleCustom(i)} aria-label='toggle goal' style={{ width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, cursor: 'pointer', background: c.done ? 'var(--green)' : 'transparent', color: c.done ? '#fff' : 'var(--text3)', border: c.done ? 'none' : '1.5px solid var(--border2)' }}>{c.done ? '✓' : ''}</button>
              <span style={{ fontSize: '13px', color: c.done ? 'var(--text3)' : 'var(--text)', textDecoration: c.done ? 'line-through' : 'none' }}>{c.text}</span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setEditing(false)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>🎯 Set Your Goals</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>Leave any blank to skip it. Progress updates automatically from your live numbers.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div><label style={lbl}>Monthly Cash Flow</label><input className='input' type='number' placeholder='5000' value={form.target_cash_flow} onChange={e => setForm((f: any) => ({ ...f, target_cash_flow: e.target.value }))} /></div>
              <div><label style={lbl}>Portfolio Value</label><input className='input' type='number' placeholder='2000000' value={form.target_value} onChange={e => setForm((f: any) => ({ ...f, target_value: e.target.value }))} /></div>
              <div><label style={lbl}>Properties</label><input className='input' type='number' placeholder='10' value={form.target_properties} onChange={e => setForm((f: any) => ({ ...f, target_properties: e.target.value }))} /></div>
              <div><label style={lbl}>Occupancy %</label><input className='input' type='number' min='0' max='100' placeholder='100' value={form.target_occupancy} onChange={e => setForm((f: any) => ({ ...f, target_occupancy: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>Your own goals</label>
              {customGoals.length > 0 && (
                <div style={{ display: 'grid', gap: '6px', marginBottom: '8px' }}>
                  {customGoals.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg3)', borderRadius: '7px', padding: '6px 10px' }}>
                      <span style={{ flex: 1, fontSize: '13px', color: c.done ? 'var(--text3)' : 'var(--text2)', textDecoration: c.done ? 'line-through' : 'none' }}>{c.text}</span>
                      <button onClick={() => removeGoal(i)} style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '17px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input className='input' placeholder='e.g. Buy a 4-plex this year' value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGoal() } }} />
                <button onClick={addGoal} className='btn btn-ghost'>Add</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(false)} className='btn btn-ghost'>Cancel</button>
              <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Saving…' : 'Save Goals'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
