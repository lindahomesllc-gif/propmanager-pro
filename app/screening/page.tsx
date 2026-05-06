'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, formatDate } from '@/lib/supabase'

export default function ScreeningPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ credit_score: '', criminal_check: 'clear', eviction_check: 'none_found', overall_score: '', ai_recommendation: 'approve', ai_reason: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('applications')
      .select('*, properties(address)')
      .eq('user_id', USER_ID)
      .not('status', 'eq', 'withdrawn')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => { setApplications(data || []); setLoading(false) })
  }, [])

  function startEdit(a) {
    setEditing(a.id)
    setForm({
      credit_score: a.credit_score ? String(a.credit_score) : '',
      criminal_check: a.criminal_check || 'clear',
      eviction_check: a.eviction_check || 'none_found',
      overall_score: a.overall_score ? String(a.overall_score) : '',
      ai_recommendation: a.ai_recommendation || 'approve',
      ai_reason: a.ai_reason || '',
    })
  }

  async function saveResults(id) {
    setSaving(true)
    const { error } = await supabase.from('applications').update({
      credit_score: form.credit_score ? parseInt(form.credit_score) : null,
      criminal_check: form.criminal_check,
      eviction_check: form.eviction_check,
      overall_score: form.overall_score ? parseInt(form.overall_score) : null,
      ai_recommendation: form.ai_recommendation,
      ai_reason: form.ai_reason || null,
      status: 'screening_complete',
      income_verified: true,
    }).eq('id', id).eq('user_id', USER_ID)
    setSaving(false)
    if (!error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, credit_score: parseInt(form.credit_score), criminal_check: form.criminal_check, eviction_check: form.eviction_check, overall_score: parseInt(form.overall_score), ai_recommendation: form.ai_recommendation, status: 'screening_complete' } : a))
      setEditing(null)
    }
  }

  const scoreColor = (s) => {
    if (!s) return '#5A5A56'
    if (s >= 700) return '#4ADE9A'
    if (s >= 600) return '#FBB040'
    return '#F87171'
  }

  const recColor = (r) => ({ approve: '#4ADE9A', review: '#FBB040', decline: '#F87171' }[r] || '#A8A69E')
  const statusColor = (s) => ({ received: '#60A5FA', screening_initiated: '#A78BFA', screening_complete: '#FBB040', approved: '#4ADE9A', denied: '#F87171' }[s] || '#A8A69E')

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5A5A56', marginBottom: '4px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const btnP = { background: '#4ADE9A', color: '#0E0E0C', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
  const btnB = { background: '#60A5FA22', color: '#60A5FA', border: '0.5px solid #60A5FA44', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const btnG = { background: 'transparent', color: '#A8A69E', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Tenant Screening</div>
        <a href='https://www.myrental.com' target='_blank' style={btnB}>🔍 Open MyRental</a>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ background: '#161620', border: '0.5px solid rgba(96,165,250,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '20px' }}>💡</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8', marginBottom: '2px' }}>How to use Screening</div>
            <div style={{ fontSize: '12px', color: '#5A5A56' }}>1. Click <strong style={{ color: '#60A5FA' }}>Open MyRental</strong> to run a background/credit check · 2. Get results from MyRental · 3. Click <strong style={{ color: '#4ADE9A' }}>Enter Results</strong> below to record them here</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Applications', value: applications.length, color: '#F0EEE8' },
            { label: 'Pending Screening', value: applications.filter(a => a.status === 'received' || a.status === 'screening_initiated').length, color: '#FBB040' },
            { label: 'Screening Complete', value: applications.filter(a => a.status === 'screening_complete').length, color: '#A78BFA' },
            { label: 'Approved', value: applications.filter(a => a.status === 'approved').length, color: '#4ADE9A' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading...</div>}
        {!loading && applications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#A8A69E', marginBottom: '6px' }}>No applications yet</div>
            <a href='/applications/new' style={{ background: '#4ADE9A', color: '#0E0E0C', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Application</a>
          </div>
        )}

        {!loading && applications.map(a => (
          <div key={a.id} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + statusColor(a.status), borderRadius: '10px', padding: '16px 20px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8' }}>{a.applicant_name}</div>
                <div style={{ fontSize: '12px', color: '#5A5A56', marginTop: '2px' }}>{a.properties?.address} · Applied {formatDate(a.submitted_at)}</div>
                <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>{a.email} {a.phone ? '· ' + a.phone : ''}</div>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: statusColor(a.status) + '22', color: statusColor(a.status), fontWeight: 600, textTransform: 'uppercase' }}>{a.status?.replace(/_/g, ' ')}</span>
            </div>

            {a.credit_score || a.criminal_check !== 'pending' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '10px' }}>
                {[
                  ['Credit Score', a.credit_score || '—', scoreColor(a.credit_score)],
                  ['Criminal', a.criminal_check || 'pending', a.criminal_check === 'clear' ? '#4ADE9A' : '#F87171'],
                  ['Eviction', a.eviction_check || 'pending', a.eviction_check === 'none_found' ? '#4ADE9A' : '#F87171'],
                  ['Recommendation', a.ai_recommendation || '—', recColor(a.ai_recommendation)],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ background: '#1E1E1B', borderRadius: '6px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '9px', color: '#5A5A56', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: c, marginTop: '2px', textTransform: 'capitalize' }}>{v}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {a.ai_reason && <div style={{ fontSize: '12px', color: '#A8A69E', marginBottom: '10px', fontStyle: 'italic' }}>{a.ai_reason}</div>}

            {editing === a.id ? (
              <div style={{ background: '#1E1E1B', borderRadius: '8px', padding: '14px', marginTop: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#5A5A56', marginBottom: '12px' }}>Enter Screening Results</div>
                <div style={{ ...g3, marginBottom: '12px' }}>
                  <div><label style={lbl}>Credit Score</label><input style={inp} type='number' placeholder='700' value={form.credit_score} onChange={e => setForm(f => ({ ...f, credit_score: e.target.value }))} /></div>
                  <div><label style={lbl}>Criminal Check</label>
                    <select style={inp} value={form.criminal_check} onChange={e => setForm(f => ({ ...f, criminal_check: e.target.value }))}>
                      <option value='clear'>Clear</option>
                      <option value='flagged'>Flagged</option>
                      <option value='pending'>Pending</option>
                    </select>
                  </div>
                  <div><label style={lbl}>Eviction Check</label>
                    <select style={inp} value={form.eviction_check} onChange={e => setForm(f => ({ ...f, eviction_check: e.target.value }))}>
                      <option value='none_found'>None Found</option>
                      <option value='found'>Found</option>
                      <option value='pending'>Pending</option>
                    </select>
                  </div>
                </div>
                <div style={{ ...g2, marginBottom: '12px' }}>
                  <div><label style={lbl}>Overall Score (0-100)</label><input style={inp} type='number' min='0' max='100' placeholder='75' value={form.overall_score} onChange={e => setForm(f => ({ ...f, overall_score: e.target.value }))} /></div>
                  <div><label style={lbl}>Recommendation</label>
                    <select style={inp} value={form.ai_recommendation} onChange={e => setForm(f => ({ ...f, ai_recommendation: e.target.value }))}>
                      <option value='approve'>Approve</option>
                      <option value='review'>Review</option>
                      <option value='decline'>Decline</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}><label style={lbl}>Notes / Reason</label><textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder='Any notes about screening results...' value={form.ai_reason} onChange={e => setForm(f => ({ ...f, ai_reason: e.target.value }))} /></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={btnP} onClick={() => saveResults(a.id)} disabled={saving}>{saving ? 'Saving...' : 'Save Results'}</button>
                  <button style={btnG} onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href='https://www.myrental.com' target='_blank' style={btnB}>🔍 Screen on MyRental</a>
                <button style={btnP} onClick={() => startEdit(a)}>Enter Results</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  )
}