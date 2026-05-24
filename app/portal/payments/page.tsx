'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function PaymentsPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/portal'); return }
      const { data: t } = await supabase.from('tenants').select('*').eq('email', user.email).eq('status', 'active').single()
      if (!t) { router.push('/portal'); return }
      const { data: p } = await supabase.from('payments').select('*').eq('tenant_id', t.id).order('due_date', { ascending: false })
      setPayments(p || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Payments</h1>
      {payments.length === 0 ? (
        <p className="text-gray-500">No payment records found.</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">${p.amount_due?.toFixed(2)}</p>
                <p className="text-sm text-gray-500">Due: {p.due_date}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                p.status === 'paid' ? 'bg-green-100 text-green-700' :
                p.status === 'late' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
