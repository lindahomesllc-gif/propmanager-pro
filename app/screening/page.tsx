'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, formatDate } from '@/lib/supabase'

export default function ScreeningPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ credit_score: '', criminal_check: 'clear', eviction_check: 'none_found', overall_score: '', ai_recommendation: 'approve', ai_reason: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null)
  const fileRef = useRef(null)
  const [uploadTarget, setUploadTarget] = useState(null)

  useEffect(() => {
    supabase.from('applications')
      .select('*, properties(address)')
      
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
    }).eq('id', id)
    setSaving(false)
    if (!error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, credit_score: parseInt(form.credit_score), criminal_check: form.criminal_check, eviction_check: form.eviction_check, overall_score: parseInt(form.overall_score), ai_recommendation: form.ai_recommendation, status: 'screening_complete' } : a))
      setEditing(null)
    }
  }

  async function uploadReport(e, appId) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(appId)
    const { data: { user: _u } } = await supabase.auth.getUser()
    const path = (_u?.id || 'unknown') + '/screening/' + appId + '/' + Date.now() + '.pdf'
    const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploading(null); return }
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(path)
    await supabase.from('applications').update({ screening_report_url: urlData.publicUrl }).eq('id', appId)
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, screening_report_url: urlData.publicUrl } : a))
    setUploading(null)
  }

  const scoreColor = (s) => { if (!s) return 'var(--text3)'; if (s >= 700) return 'var(--green)'; if (s >= 600) return 'var(--amber)'; return 'var(--red)' }
  const recColor = (r) => ({ approve: 'var(--green)', review: 'var(--amber)', decline: 'var(--red)' }[r] || 'var(--text2)')
  const statusColor = (s) => ({ received: 'var(--blue)', screening_initiated: '#A78BFA', screening_complete: 'var(--amber)', approved: 'var(--green)', denied: 'var(--red)' }[s] || 'var(--text2)')

  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
  const btnB = { background: '#60A5FA22', color: 'var(--blue)', border: '0.5px solid #60A5FA44', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const btnY = { background: '#FBB04022', color: 'var(--amber)', border: '0.5px solid #FBB04044', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Tenant Screening</div>
        <a href='https://www.myrental.com' target='_blank' style={btnB}>🔍 Open MyRental</a>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ background: 'var(--bg3)', border: '0.5px solid rgba(96,165,250,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '20px' }}>💡</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>How to use Screening</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>1. Click <strong style={{ color: 'var(--blue)' }}>Open MyRental</strong> to run a background/credit check · 2. Download the report PDF from MyRental · 3. Click <strong style={{ color: 'var(--amber)' }}>Upload Report</strong> to save it here · 4. Click <strong style={{ color: 'var(--green)' }}>Enter Results</strong> to record the scores</div>
          </div>
        </div>

        <input ref={fileRef} type='file' accept='application/pdf' style={{ display: 'none' }} onChange={e => uploadTarget && uploadReport(e, uploadTarget)} />

        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && applications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>No applications yet</div>
            <a href='/applications/new' style={{ background: 'var(--green)', color: 'var(--bg)', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Application</a>
          </div>
        )}

        {!loading && applications.map(a => (
          <div key={a.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + statusColor(a.status), borderRadius: '10px', padding: '16px 20px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{a.applicant_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{a.properties?.address} · Applied {formatDate(a.submitted_at)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{a.email} {a.phone ? '· ' + a.phone : ''}</div>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: statusColor(a.status) + '22', color: statusColor(a.status), fontWeight: 600, textTransform: 'uppercase' }}>{a.status?.replace(/_/g, ' ')}</span>
            </div>

            {a.credit_score || a.criminal_check !== 'pending' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '10px' }}>
                {[
                  ['Credit Score', a.credit_score || '—', scoreColor(a.credit_score)],
                  ['Criminal', a.criminal_check || 'pending', a.criminal_check === 'clear' ? 'var(--green)' : 'var(--red)'],
                  ['Eviction', a.eviction_check || 'pending', a.eviction_check === 'none_found' ? 'var(--green)' : 'var(--red)'],
                  ['Recommendation', a.ai_recommendation || '—', recColor(a.ai_recommendation)],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: c, marginTop: '2px', textTransform: 'capitalize' }}>{v}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {a.screening_report_url && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--green)' }}>✓ Screening report uploaded</span>
                <a href={a.screening_report_url} target='_blank' style={{ fontSize: '11px', color: 'var(--blue)', textDecoration: 'none' }}>View PDF →</a>
              </div>
            )}

            {a.ai_reason && <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px', fontStyle: 'italic' }}>{a.ai_reason}</div>}

            {editing === a.id ? (
              <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '14px', marginTop: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '12px' }}>Enter Screening Results</div>
                <div style={{ ...g3, marginBottom: '12px' }}>
                  <div><label style={lbl}>Credit Score</label><input className='input' type='number' placeholder='700' value={form.credit_score} onChange={e => setForm(f => ({ ...f, credit_score: e.target.value }))} /></div>
                  <div><label style={lbl}>Criminal Check</label>
                    <select className='input' value={form.criminal_check} onChange={e => setForm(f => ({ ...f, criminal_check: e.target.value }))}>
                      <option value='clear'>Clear</option>
                      <option value='flagged'>Flagged</option>
                      <option value='pending'>Pending</option>
                    </select>
                  </div>
                  <div><label style={lbl}>Eviction Check</label>
                    <select className='input' value={form.eviction_check} onChange={e => setForm(f => ({ ...f, eviction_check: e.target.value }))}>
                      <option value='none_found'>None Found</option>
                      <option value='found'>Found</option>
                      <option value='pending'>Pending</option>
                    </select>
                  </div>
                </div>
                <div style={{ ...g2, marginBottom: '12px' }}>
                  <div><label style={lbl}>Overall Score (0-100)</label><input className='input' type='number' min='0' max='100' placeholder='75' value={form.overall_score} onChange={e => setForm(f => ({ ...f, overall_score: e.target.value }))} /></div>
                  <div><label style={lbl}>Recommendation</label>
                    <select className='input' value={form.ai_recommendation} onChange={e => setForm(f => ({ ...f, ai_recommendation: e.target.value }))}>
                      <option value='approve'>Approve</option>
                      <option value='review'>Review</option>
                      <option value='decline'>Decline</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}><label style={lbl}>Notes / Reason</label><textarea className='input' style={{ resize: 'vertical' }} rows={2} placeholder='Any notes about screening results...' value={form.ai_reason} onChange={e => setForm(f => ({ ...f, ai_reason: e.target.value }))} /></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className='btn btn-primary' onClick={() => saveResults(a.id)} disabled={saving}>{saving ? 'Saving...' : 'Save Results'}</button>
                  <button className='btn btn-ghost' onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a href='https://www.myrental.com' target='_blank' style={btnB}>🔍 Screen on MyRental</a>
                <button style={btnY} onClick={() => { setUploadTarget(a.id); setTimeout(() => fileRef.current?.click(), 100) }}>{uploading === a.id ? 'Uploading...' : '⬆ Upload Report'}</button>
                <button className='btn btn-primary' onClick={() => startEdit(a)}>Enter Results</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  )
}