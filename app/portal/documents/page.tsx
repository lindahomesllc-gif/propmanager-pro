'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtMoney = (n: any) => '$' + (Number(n) || 0).toLocaleString()

export default function DocumentsPage() {
  const router = useRouter()
  const [leases, setLeases] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/portal'); return }
      const { data: t } = await supabase.from('tenants').select('*').eq('email', user.email).eq('status', 'active').single()
      if (!t) { router.push('/portal'); return }
      const { data: l } = await supabase.from('leases').select('*').eq('tenant_id', t.id).order('created_at', { ascending: false })
      setLeases(l || [])
      const { data: r } = await supabase.from('condition_reports').select('*').eq('property_id', t.property_id).order('created_at', { ascending: false })
      setReports(r || [])
      setLoading(false)
    }
    load()
  }, [])

  async function openDoc(u: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/portal/file?u=' + encodeURIComponent(u), { headers: { Authorization: 'Bearer ' + (session?.access_token || '') } })
    const j = await res.json().catch(() => ({}))
    if (j.url) window.open(j.url, '_blank'); else alert('Could not open this file.')
  }

  const linkBtn = { background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' as const }
  const sectionTtl = { fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '4px 0 10px' }
  const row = { background: '#fff', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F3', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a href='/portal/dashboard' style={{ color: '#2D6A4F', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← Back</a>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>📄 My Documents</div>
      </div>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px' }}>
        {loading ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {[0, 1].map(i => <div key={i} style={{ height: '66px', borderRadius: '12px', background: '#ECEFEA' }} />)}
          </div>
        ) : (
          <>
            <div style={sectionTtl}>Leases</div>
            {leases.length === 0 ? (
              <div style={{ ...row, justifyContent: 'center', color: '#888', fontSize: '13px', marginBottom: '24px' }}>No leases on file yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                {leases.map(l => (
                  <div key={l.id} style={row}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A1A' }}>📋 Lease · {fmtMoney(l.rent_amount)}/mo</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px', textTransform: 'capitalize' }}>{fmtDate(l.start_date)} → {fmtDate(l.end_date)} · {l.status?.replace('_', ' ')}</div>
                    </div>
                    {l.pdf_url
                      ? <button onClick={() => openDoc(l.pdf_url)} style={{ ...linkBtn, cursor: 'pointer' }}>View PDF</button>
                      : <span style={{ fontSize: '11px', color: '#AAA' }}>No file</span>}
                  </div>
                ))}
              </div>
            )}

            <div style={sectionTtl}>Inspection Reports</div>
            {reports.length === 0 ? (
              <div style={{ ...row, justifyContent: 'center', color: '#888', fontSize: '13px' }}>No inspection reports yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {reports.map(r => (
                  <div key={r.id} style={row}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A1A', textTransform: 'capitalize' }}>🔍 {r.report_type?.replace('_', ' ')}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{fmtDate(r.inspection_date)}</div>
                    </div>
                    {r.pdf_url
                      ? <button onClick={() => openDoc(r.pdf_url)} style={{ ...linkBtn, cursor: 'pointer' }}>View PDF</button>
                      : <span style={{ fontSize: '11px', color: '#AAA' }}>No file</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
