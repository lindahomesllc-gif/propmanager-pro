import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: '#0E0E0C',
    }}>
      <Sidebar />
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  )
}
