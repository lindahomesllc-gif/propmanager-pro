'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('applications').select('*, properties(address)').eq('user_id', USER_ID).order('submitted_at', { ascending: false }),
      supabase.from('properties').select('id, address').eq('user_id', USER_ID),
    ]).then(([a, p]) => {
      setApplications(a.data || [])
      setProperties(p.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)

  const statusColor = (s) => ({
    received: '#60A5FA',
    screening_initiated: '#A78BFA',
    screening_complete: '#FBB040',
    approved: '#4ADE9A',
    denied: '#F87171',
    withdrawn: '#A8A69E',
  }[s] || '#A8A69E')

  const recColor = (r) => ({ approve: '#4ADE9A', review: '#FBB040', decline: '#F87171' }[r] || '#A8A69E')

  async function updateStatus(id, status) {
    await supabase.from('applications').update({ status, decided_at: new Date().toISOString() }).eq('id', id).eq('user_id', USER_ID)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const sel = { padding: '6px 10px', fontSize: '12px', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', background: '#1E1E1B', color: '#F0EEE8', outline: 'none' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161614', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F0EEE8' }}>Applications</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={sel}>
            <option value='all'>All Applications</option>
            <option value='received'>Received</option>
            <option value='screening_initiated'>Screening</option>
            <option value='screening_complete'>Screening Complete</option>
            <option value='approved'>Approved</option>
            <option value='denied'>Denied</option>
            <option value='withdrawn'>Withdrawn</option>
          </select>
          <a href='/applications/new' style={{ background: '#4ADE9A', color: '#0E0E0C', borderRadius: '7px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>+ New Application</a>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: applications.length, color: '#F0EEE8' },
            { label: 'Received', value: applications.filter(a => a.status === 'received').length, color: '#60A5FA' },
            { label: 'In Screening', value: applications.filter(a => a.status === 'screening_initiated' || a.status === 'screening_complete').length, color: '#A78BFA' },
            { label: 'Approved', value: applications.filter(a => a.status === 'approved').length, color: '#4ADE9A' },
            { label: 'Denied', value: applications.filter(a => a.status === 'denied').length, color: '#F87171' },
          ].map(mc => (
            <div key={mc.label} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#5A5A56', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#5A5A56' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5A5A56' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#A8A69E', marginBottom: '6px' }}>No applications yet</div>
            <a href='/applications/new' style={{ background: '#4ADE9A', color: '#0E0E0C', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Application</a>
          </div>
        )}
        {!loading && filtered.map(a => (
          <div key={a.id} style={{ background: '#161614', border: '0.5px solid rgba(255,255,255,0.07)', borderLeft: '3px solid ' + statusColor(a.status), borderRadius: '10px', padding: '16px 20px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8' }}>{a.applicant_name}</div>
                <div style={{ fontSize: '12px', color: '#5A5A56', marginTop: '2px' }}>{a.email} {a.phone ? '· ' + a.phone : ''}</div>
                <div style={{ fontSize: '11px', color: '#5A5A56', marginTop: '2px' }}>{a.properties?.address} · Applied {formatDate(a.submitted_at)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: statusColor(a.status) + '22', color: statusColor(a.status), fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{a.status?.replace(/_/g, ' ')}</span>
                {a.ai_recommendation && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: recColor(a.ai_recommendation) + '22', color: recColor(a.ai_recommendation), fontWeight: 600, textTransform: 'uppercase' }}>AI: {a.ai_recommendation}</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                ['Income', a.monthly_income ? fm(a.monthly_income) + '/mo' : '—'],
                ['Credit Score', a.credit_score || '—'],
                ['Move In', a.desired_move_in ? formatDate(a.desired_move_in) : '—'],
                ['Score', a.overall_score ? a.overall_score + '/100' : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#1E1E1B', borderRadius: '6px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '9px', color: '#5A5A56', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: '12px', color: '#F0EEE8', marginTop: '1px', fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
            {a.status === 'received' || a.status === 'screening_complete' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => updateStatus(a.id, 'approved')} style={{ background: '#4ADE9A22', color: '#4ADE9A', border: '0.5px solid #4ADE9A44', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>✓ Approve</button>
                <button onClick={() => updateStatus(a.id, 'denied')} style={{ background: '#F8717122', color: '#F87171', border: '0.5px solid #F8717144', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>✗ Deny</button>
                <button onClick={() => updateStatus(a.id, 'screening_initiated')} style={{ background: '#A78BFA22', color: '#A78BFA', border: '0.5px solid #A78BFA44', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Run Screening</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </AppShell>
  )
}