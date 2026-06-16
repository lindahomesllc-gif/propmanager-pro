'use client'
// Connects the three investor tools into one path: Analyze → Model → Deploy.
// Carries the selected property forward where known.
export default function StrategyFlow({ step, propertyId }: { step: 1 | 2 | 3; propertyId?: string }) {
  const pq = propertyId ? '?property=' + propertyId : ''
  const steps = [
    { n: 1, icon: '🔍', label: 'Analyze', href: '/analyze' },
    { n: 2, icon: '🧮', label: 'Model', href: '/modeler' + pq },
    { n: 3, icon: '🌱', label: 'Deploy', href: '/deploy' },
  ]
  return (
    <div className='no-print' style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '12px' }}>
      {steps.map((s, i) => (
        <span key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <a href={s.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '20px', border: '0.5px solid ' + (s.n === step ? 'var(--green)' : 'var(--border2)'), background: s.n === step ? 'var(--green-bg)' : 'transparent', color: s.n === step ? 'var(--green)' : 'var(--text2)', fontWeight: s.n === step ? 700 : 400 }}>
            <span>{s.icon}</span><span>{s.n}. {s.label}</span>
          </a>
          {i < steps.length - 1 && <span style={{ color: 'var(--text3)' }}>›</span>}
        </span>
      ))}
    </div>
  )
}
