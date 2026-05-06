'use client'
import AppShell from '@/components/AppShell'
export default function Page() {
  return (
    <AppShell>
      <div style={{padding:'40px',color:'var(--text3)',fontSize:'13px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
        <div style={{fontSize:'40px'}}>🔧</div>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:'18px',fontWeight:700,color:'var(--text)',textTransform:'capitalize'}}>market</div>
        <div>This module is fully designed — wiring in next session.</div>
        <a href="/dashboard" style={{color:'var(--green)',textDecoration:'none',fontSize:'12px'}}>← Back to Dashboard</a>
      </div>
    </AppShell>
  )
}
