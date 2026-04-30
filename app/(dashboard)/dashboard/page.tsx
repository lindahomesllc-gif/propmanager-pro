// app/(dashboard)/dashboard/page.tsx
// Main landlord dashboard — server component, reads real data

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()

  // Redirect to login if not authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load all dashboard data in parallel (fast!)
  const [
    { data: properties },
    { data: payments },
    { data: expenses },
    { data: maintenanceOpen },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('*, leases(rent_amount, status), mortgages(monthly_payment)')
      .eq('user_id', user.id),

    supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .gte('due_date', new Date(new Date().getFullYear(), 0, 1).toISOString())
      .order('due_date', { ascending: false }),

    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', new Date(new Date().getFullYear(), 0, 1).toISOString()),

    supabase
      .from('maintenance_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['open', 'in_progress']),
  ])

  // Calculate key metrics
  const totalMonthlyRent = properties?.reduce((sum, p) => {
    const activeLease = p.leases?.find((l: any) => l.status === 'active')
    return sum + (activeLease?.rent_amount || 0)
  }, 0) || 0

  const totalMortgages = properties?.reduce((sum, p) => {
    return sum + (p.mortgages?.[0]?.monthly_payment || 0)
  }, 0) || 0

  const collectedYTD = payments
    ?.filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.total_amount, 0) || 0

  const duePayments = payments?.filter(p => p.status === 'due') || []
  const totalDue = duePayments.reduce((sum, p) => sum + p.total_amount, 0)

  const totalExpensesYTD = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
  const netIncomeYTD = collectedYTD - totalExpensesYTD

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-6">
        Welcome back! Here's your portfolio at a glance.
      </p>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Monthly Rent"
          value={`$${totalMonthlyRent.toLocaleString()}`}
          sub={`${properties?.filter(p => p.occupancy === 'occupied').length}/${properties?.length} occupied`}
          color="green"
        />
        <MetricCard
          label="Collected YTD"
          value={`$${collectedYTD.toLocaleString()}`}
          sub="All properties"
          color="green"
        />
        <MetricCard
          label="Due Now"
          value={`$${totalDue.toLocaleString()}`}
          sub={`${duePayments.length} payment${duePayments.length !== 1 ? 's' : ''}`}
          color={totalDue > 0 ? 'amber' : 'green'}
        />
        <MetricCard
          label="Net Income YTD"
          value={`$${netIncomeYTD.toLocaleString()}`}
          sub="Income minus expenses"
          color={netIncomeYTD >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Properties List */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Properties</h2>
          <a href="/dashboard/properties/new"
            className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
            + Add Property
          </a>
        </div>
        <div className="grid gap-4">
          {properties?.map(p => (
            <a key={p.id} href={`/dashboard/properties/${p.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-green-500 transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{p.address}</div>
                  <div className="text-sm text-gray-500">{p.city}, {p.state} · {p.type}</div>
                </div>
                <div className="text-right">
                  <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                    p.occupancy === 'occupied'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {p.occupancy === 'occupied' ? 'Occupied' : 'Vacant'}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Open Maintenance */}
      {(maintenanceOpen?.length || 0) > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-4">
            Open Maintenance ({maintenanceOpen?.length})
          </h2>
          <div className="grid gap-3">
            {maintenanceOpen?.map(m => (
              <div key={m.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  m.priority === 'high' || m.priority === 'emergency'
                    ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{m.title}</div>
                  <div className="text-sm text-gray-500 capitalize">{m.priority} priority · {m.status.replace('_', ' ')}</div>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// Simple metric card component
function MetricCard({
  label, value, sub, color
}: {
  label: string
  value: string
  sub: string
  color: 'green' | 'amber' | 'red' | 'blue'
}) {
  const colorMap = {
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
  }
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}
