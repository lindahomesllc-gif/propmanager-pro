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
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGoals({}); return }
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).maybeSingle()
    const g = data || {}
    setGoals(g)
    setForm({
      target_cash_flow: g.target_cash_flow ?? '', target_value: g.target_value ?? '',
      target_properties: g.target_properties ?? '', target_occupancy: g.target_occupancy ?? '',
    })
  }
  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = {
      user_id: user?.id,
      target_cash_flow: form.target_cash_flow !== '' ? parseFloat(form.target_cash_flow) : null,
      target_value: form.target_value !== '' ? parseFloat(form.target_value) : null,
      target_properties: form.target_properties !== '' ? parseInt(form.target_properties) : null,
      target_occupancy: form.target_occupancy !== '' ? parseFloat(form.target_occupancy) : null,
    }
    const { error } = await supabase.from('goals').upsert(payload, { onConflict: 'user_id' })
    setSaving(false)
    if (error) { alert('Could not save goals: ' + error.message); return }
    setGoals(payload); setEditing(false)
  }

  if (goals === null) return null
  const setGoals2 = DEFS.filter(d => goals[d.key] != null && Number(goals[d.key]) > 0)
  const curOf = (d: any) => (current as any)[d.cur] || 0

  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }

  return (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--green)', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: setGoals2.length ? '14px' : '0' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>🎯 Goals</div>
        <button onClick={() => setEditing(true)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>{setGoals2.length ? 'Edit goals' : '+ Set goals'}</button>
      </div>

      {setGoals2.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>Set a few targets — cash flow, portfolio value, properties, occupancy — and track your progress every time you open the app.</div>
      ) : (
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
