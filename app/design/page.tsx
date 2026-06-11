'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function DesignPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', client_name: '', client_email: '', address: '', style_summary: '' })

  async function load() {
    const [{ data: projs }, { data: items }] = await Promise.all([
      supabase.from('design_projects').select('*').order('created_at', { ascending: false }),
      supabase.from('design_items').select('project_id, kind'),
    ])
    setProjects(projs || [])
    const c: Record<string, number> = {}
    ;(items || []).forEach((it: any) => { if (it.kind === 'finish') c[it.project_id] = (c[it.project_id] || 0) + 1 })
    setCounts(c)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    setForm({ name: '', client_name: '', client_email: '', address: '', style_summary: '' })
    setError(''); setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) { setError('Project name is required'); return }
    setSaving(true); setError('')
    const payload = {
      name: form.name.trim(),
      client_name: form.client_name.trim() || null,
      client_email: form.client_email.trim() || null,
      address: form.address.trim() || null,
      style_summary: form.style_summary.trim() || null,
    }
    const { data, error: err } = await supabase.from('design_projects').insert(payload).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowForm(false)
    if (data?.id) router.push('/design/' + data.id)
  }

  async function delProject(p: any, e: any) {
    e.stopPropagation()
    if (!confirm('Delete “' + p.name + '” and everything in it (rooms, finishes, photos)? This cannot be undone.')) return
    const { error } = await supabase.from('design_projects').delete().eq('id', p.id)
    if (error) { alert('Could not delete: ' + error.message); return }
    setProjects(list => list.filter(x => x.id !== p.id))
  }

  const visible = projects.filter(p => showArchived ? p.status === 'archived' : p.status !== 'archived')
  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }

  return (
    <AppShell>
      <div className='design-theme' style={{ display: 'contents' }}>
      <div className='design-grad' style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, color: '#fff' }}>🎨 Design Studio</div>
        <button onClick={openAdd} style={{ background: '#fff', color: '#0B7E7E', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ New Project</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '640px' }}>
            A vision board + finishes tracker for each home you design. Build the moodboard, log every tile, paint and fixture, track decisions, then share a private link your client can approve from.
          </div>
          <button onClick={() => setShowArchived(s => !s)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px', flexShrink: 0 }}>
            {showArchived ? '← Active projects' : 'View archived'}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '12px' }}>{[0, 1, 2].map(i => <div key={i} className='skeleton' style={{ height: '150px' }} />)}</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎨</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '14px' }}>{showArchived ? 'No archived projects' : 'No design projects yet'}</div>
            {!showArchived && <button onClick={openAdd} className='btn btn-primary'>+ Start your first project</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '12px' }}>
            {visible.map(p => (
              <div key={p.id} onClick={() => router.push('/design/' + p.id)} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                <div style={{ height: '110px', background: p.cover_image_url ? `center/cover no-repeat url(${p.cover_image_url})` : 'linear-gradient(120deg, #0EA5A5, #38BDF8 55%, #FB7185)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '8px' }}>
                  {!p.cover_image_url && <div style={{ position: 'absolute', fontSize: '30px', opacity: 0.4, alignSelf: 'center', width: '100%', textAlign: 'center', pointerEvents: 'none' }}>🏠</div>}
                  <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                    {p.share_enabled && <span className='chip chip-g' style={{ fontSize: '9px' }}>🔗 Shared</span>}
                  </div>
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>
                    {p.client_name || 'No client set'}{p.address ? ' · ' + p.address : ''}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                      {counts[p.id] || 0} finish{(counts[p.id] || 0) === 1 ? '' : 'es'}
                    </div>
                    <button onClick={e => delProject(p, e)} title='Delete project' style={{ background: 'transparent', color: 'var(--red)', border: 'none', fontSize: '11px', cursor: 'pointer', padding: '2px 4px' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '440px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>New Design Project</div>
            {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '12px', padding: '10px 14px', borderRadius: '7px', marginBottom: '12px' }}>{error}</div>}
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Project name *</label>
              <input style={inp} placeholder='e.g. Maple St. Whole-Home Remodel' value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Client name</label>
                <input style={inp} placeholder='Jane Doe' value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Client email</label>
                <input style={inp} placeholder='jane@email.com' value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Address</label>
              <input style={inp} placeholder='123 Maple St' value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>Overall style / feel</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder='Warm modern, natural materials, calm and airy…' value={form.style_summary} onChange={e => setForm(f => ({ ...f, style_summary: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className='btn btn-ghost'>Cancel</button>
              <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Creating…' : 'Create Project'}</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  )
}
