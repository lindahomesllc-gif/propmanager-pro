'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function TenantMaintenance() {
  const [tickets, setTickets] = useState<any[]>([])
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'plumbing', priority: 'medium' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/portal'); return }
      const { data: t } = await supabase.from('tenants').select('*, properties(id, address)').eq('email', user.email).eq('status', 'active').single()
      if (!t) { router.push('/portal'); return }
      setTenant(t)
      const { data: m } = await supabase.from('maintenance').select('*').eq('tenant_id', t.id).order('created_at', { ascending: false })
      setTickets(m || [])
      setLoading(false)
    }
    load()
  }, [])

  async function submitRequest() {
    if (!form.title) { setError('Please enter a title'); return }
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase.from('maintenance').insert({
      user_id: tenant.user_id,
      tenant_id: tenant.id,
      property_id: tenant.properties?.id || tenant.property_id,
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      status: 'open',
    }).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    setTickets(prev => [data, ...prev])
    setForm({ title: '', description: '', category: 'plumbing', priority: 'medium' })
    setShowForm(false)
    setSuccess('Request submitted! Your landlord will be in touch soon.')
    setTimeout(() => setSuccess(''), 4000)
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const statusColor = (s) => ({ open: '#D97706', scheduled: '#2563EB', in_progress: '#7C3AED', completed: '#2D6A4F', cancelled: '#6B7280' }[s] || '#6B7280')
  const statusBg = (s) => ({ open: '#FEF3C7', scheduled: '#EFF6FF', in_progress: '#EDE9FE', completed: '#DCFCE7', cancelled: '#F3F4F6' }[s] || '#F3F4F6')
  const priorityColor = (p) => ({ emergency: '#DC2626', high: '#D97706', medium: '#2563EB', low: '#2D6A4F' }[p] || '#6B7280')

  const inp = { width: '100%', padding: '10px 12px', fontSize: '13px', border: '1.5px solid #E5E7EB', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' as const, background: '#FAFAFA' }

  if (loading) return <div style={{ minHeight: '100vh', background: '#F6F8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#666' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F3', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href='/portal/dashboard' style={{ color: '#2D6A4F', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← Back</a>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>🔧 Maintenance</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '+ New Request'}
        </button>
      </div>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px' }}>
        {success && <div style={{ background: '#DCFCE7', color: '#166534', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>✅ {success}</div>}
        {showForm && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A1A', marginBottom: '16px' }}>Submit a Maintenance Request</div>
            {error && <div style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder='e.g. Leaking faucet in bathroom' style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder='Describe the issue in detail...' rows={3} style={{ ...inp, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} style={inp}>
                    <option value='plumbing'>Plumbing</option>
                    <option value='electrical'>Electrical</option>
                    <option value='hvac'>HVAC</option>
                    <option value='appliance'>Appliance</option>
                    <option value='structural'>Structural</option>
                    <option value='pest_control'>Pest Control</option>
                    <option value='landscaping'>Landscaping</option>
                    <option value='cleaning'>Cleaning</option>
                    <option value='locks'>Locks</option>
                    <option value='windows'>Windows</option>
                    <option value='other'>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} style={inp}>
                    <option value='low'>Low</option>
                    <option value='medium'>Medium</option>
                    <option value='high'>High</option>
                    <option value='emergency'>Emergency</option>
                  </select>
                </div>
              </div>
              <button onClick={submitRequest} disabled={saving} style={{ background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
        {tickets.length === 0 && !showForm ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔧</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', marginBottom: '8px' }}>No maintenance requests</div>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>Submit a request if something needs attention.</div>
            <button onClick={() => setShowForm(true)} style={{ background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ New Request</button>
          </div>
        ) : tickets.map(t => (
          <div key={t.id} style={{ background: '#fff', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', marginBottom: '10px', borderLeft: '3px solid ' + priorityColor(t.priority) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>{t.title}</div>
              <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: statusBg(t.status), color: statusColor(t.status), fontWeight: 700, textTransform: 'capitalize', flexShrink: 0, marginLeft: '8px' }}>{t.status?.replace('_', ' ')}</span>
            </div>
            {t.description && <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px', lineHeight: 1.5 }}>{t.description}</div>}
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#888' }}>
              <span>📂 {t.category?.replace('_', ' ')}</span>
              <span>📅 {formatDate(t.created_at)}</span>
              <span style={{ color: priorityColor(t.priority), fontWeight: 600, textTransform: 'capitalize' }}>● {t.priority}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
