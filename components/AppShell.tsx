import Sidebar from '@/components/Sidebar'
import AuthGate from '@/components/AuthGate'
import TrialBanner from '@/components/TrialBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className='app-root' style={{
        display: 'flex', height: '100vh', overflow: 'hidden',
        background: 'var(--bg)',
      }}>
        <Sidebar />
        <main className='app-main' style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', minWidth: 0,
        }}>
          <TrialBanner />
          {children}
        </main>
      </div>
    </AuthGate>
  )
}
