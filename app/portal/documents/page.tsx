'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function DocumentsPage() {
  const supabase = createClientComponentClient()
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

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Documents</h1>
      <h2 className="text-lg font-semibold mb-3">Leases</h2>
      {leases.length === 0 ? <p className="text-gray-500 mb-6">No leases found.</p> : (
        <div className="space-y-3 mb-6">
          {leases.map((l) => (
            <div key={l.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">${l.rent_amount}/mo</p>
                <p className="text-sm text-gray-500">{l.start_date} → {l.end_date}</p>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-500 capitalize">{l.status}</span>
                {l.pdf_url && (
                  <a href={l.pdf_url} target="_blank" className="text-blue-600 text-sm underline">View PDF</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <h2 className="text-lg font-semibold mb-3">Inspection Reports</h2>
      {reports.length === 0 ? <p className="text-gray-500">No reports found.</p> : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium capitalize">{r.report_type.replace('_', ' ')}</p>
                <p className="text-sm text-gray-500">{r.inspection_date}</p>
              </div>
              {r.pdf_url && (
                <a href={r.pdf_url} target="_blank" className="text-blue-600 text-sm underline">View PDF</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
