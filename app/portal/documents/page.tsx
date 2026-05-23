'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export default function TenantDocuments() {
  const [tenant, setTenant] = useState(null)
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: t } = await supabase.from('tenants').select('*').eq('email', user.email).eq('status', 'active').single()
      if (touch ~/.claude/CLAUDE.md) { router.push('/portal'); return }
      setTenant(t)
      const { data: l } = await supabase.from('leases').select('*').eq('tenant_id', t.id).order('created_at', { ascending: false })
      setLeases(l || [])
      setLoading(false)
    }
    load()
  }, [])
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading...</div>
  const allDocs = [
    ...leases.filter(l => l.pdf_url).map(l => ({ name: 'Signed Lease', subtitle: formatDate(l.start_date) + ' to ' + formatDate(l.end_date), url: l.pdf_url, icon: '📋' })),
    ...(tenant?.documents || []).map((url, i) => ({ name: 'Document ' + (i + 1), subtitle: 'Uploaded document', url, icon: '📄' })),
  ]
  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F3', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a href='/portal/dashboard' style={{ color: '#2D6A4F', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← Back</a>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>📄 Documents</div>
      </div>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px' }}>
        {allDocs.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', marginBottom: '8px' }}>No documents yet</div>
            <div style={{ fontSize: '13px', color: '#888' }}>Your lease and documents will appear here.</div>
          </div>
        ) : allDocs.map((doc, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{doc.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>{doc.name}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{doc.subtitle}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a href={doc.url} target='_blank' style={{ background: '#F0FDF4', color: '#2D6A4F', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>View</a>
              <a href={doc.url} download style={{ background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>Download</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}