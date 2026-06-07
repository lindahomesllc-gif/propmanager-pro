'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchBilling } from '@/lib/billing'

// Gates landlord pages behind a Supabase session AND an active subscription/trial.
// Signed out → /login. Trial expired & not subscribed → /billing (which stays
// reachable so they can pay). The tenant portal doesn't use AppShell, so it's
// unaffected. Billing check fails OPEN (see fetchBilling) so it never wrongly locks out.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const b = await fetchBilling()
      if (!active) return
      if (!b.entitled && pathname !== '/billing') { router.replace('/billing'); return }
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [pathname])

  if (!ready) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Loading…
      </div>
    )
  }
  return <>{children}</>
}
