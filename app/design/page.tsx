'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

// Warm editorial "studio" palette for the Design landing.
const CREAM = '#F6F1E8', CARD = '#FFFFFF', INK = '#3D362E', INK2 = '#7C7264', FAINT = '#A99E8E'
const LINE = 'rgba(61,54,46,0.12)', LINE2 = 'rgba(61,54,46,0.24)', ACCENT = '#A78A5E'
const SERIF = "'Cormorant Garamond', serif"
const PLACEHOLDER = 'linear-gradient(150deg, #EFE7D8, #DBCDB6)'

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
  const initials = (name: string) => (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '◦'

  const eyebrow: any = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: FAINT }
  const cta: any = { fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff', background: ACCENT, border: 'none', borderRadius: '3px', padding: '13px 26px', cursor: 'pointer', transition: 'background .2s' }
  const inp: any = { width: '100%', padding: '10px 13px', fontSize: '13px', border: '1px solid ' + LINE2, borderRadius: '4px', background: '#fff', color: INK, outline: 'none', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }
  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: FAINT, marginBottom: '5px' }

  return (
    <AppShell>
      <div style={{ flex: 1, overflowY: 'auto', background: CREAM, color: INK }}>
        {/* hero */}
        <div style={{ padding: '54px 44px 38px', borderBottom: '1px solid ' + LINE }}>
          <div style={eyebrow}>Interior Design · Studio</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap', marginTop: '14px' }}>
            <div>
              <h1 style={{ fontFamily: SERIF, fontSize: '56px', fontWeight: 500, lineHeight: 0.98, letterSpacing: '0.005em', color: INK, margin: 0 }}>Design <span style={{ fontStyle: 'italic', fontWeight: 500 }}>Studio</span></h1>
              <div style={{ fontSize: '14px', color: INK2, lineHeight: 1.6, maxWidth: '460px', marginTop: '16px' }}>Moodboards, finishes &amp; client approvals — one calm place to design every home, from first inspiration to the last fixture.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '11px' }}>
              <button onClick={openAdd} style={cta} onMouseEnter={e => (e.currentTarget.style.background = '#8E7349')} onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}>+ New Project</button>
              <a href='/design/vendors' style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: INK2, textDecoration: 'none', borderBottom: '1px solid ' + LINE2, paddingBottom: '2px' }}>Vendors &amp; trades →</a>
            </div>
          </div>
        </div>

        {/* projects */}
        <div style={{ padding: '34px 44px 64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={eyebrow}>{showArchived ? 'Archived' : 'Projects'}{!loading && visible.length > 0 ? '  ·  ' + visible.length : ''}</div>
            <button onClick={() => setShowArchived(s => !s)} style={{ background: 'transparent', border: 'none', color: INK2, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '1px solid ' + LINE2, paddingBottom: '2px' }}>
              {showArchived ? '← Active projects' : 'View archived'}
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '22px' }}>{[0, 1, 2].map(i => <div key={i} className='skeleton' style={{ height: '270px', borderRadius: '10px' }} />)}</div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '70px 20px' }}>
              <div style={{ fontFamily: SERIF, fontSize: '30px', fontStyle: 'italic', color: INK2, marginBottom: '6px' }}>{showArchived ? 'Nothing archived' : 'A blank canvas'}</div>
              <div style={{ fontSize: '13px', color: FAINT, marginBottom: '22px' }}>{showArchived ? 'Archived projects will appear here.' : 'Start your first design project and build its vision board.'}</div>
              {!showArchived && <button onClick={openAdd} style={cta} onMouseEnter={e => (e.currentTarget.style.background = '#8E7349')} onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}>+ New Project</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '22px' }}>
              {visible.map(p => (
                <div key={p.id} onClick={() => router.push('/design/' + p.id)}
                  style={{ background: CARD, border: '1px solid ' + LINE, borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s, border-color .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(61,54,46,0.12)'; e.currentTarget.style.borderColor = LINE2 }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = LINE }}>
                  <div style={{ height: '188px', background: p.cover_image_url ? `center/cover no-repeat url(${p.cover_image_url})` : PLACEHOLDER, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!p.cover_image_url && <div style={{ fontFamily: SERIF, fontSize: '44px', fontStyle: 'italic', color: 'rgba(61,54,46,0.20)' }}>{initials(p.name)}</div>}
                    {p.share_enabled && <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.92)', color: INK2, padding: '4px 9px', borderRadius: '3px' }}>Shared</span>}
                  </div>
                  <div style={{ padding: '17px 19px 18px' }}>
                    <div style={{ fontFamily: SERIF, fontSize: '23px', fontWeight: 600, lineHeight: 1.1, color: INK }}>{p.name}</div>
                    <div style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: FAINT, marginTop: '7px' }}>
                      {[p.client_name, p.address].filter(Boolean).join('  ·  ') || 'No client set'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid ' + LINE }}>
                      <div style={{ fontSize: '12px', color: INK2 }}>{counts[p.id] || 0} finish{(counts[p.id] || 0) === 1 ? '' : 'es'}</div>
                      <button onClick={e => delProject(p, e)} title='Delete project' style={{ background: 'transparent', color: FAINT, border: 'none', fontSize: '11px', cursor: 'pointer', padding: '2px 4px' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#B4534B')} onMouseLeave={e => (e.currentTarget.style.color = FAINT)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(40,35,28,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#FBF8F2', border: '1px solid ' + LINE, borderRadius: '12px', padding: '28px', width: '440px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: SERIF, fontSize: '26px', fontWeight: 600, color: INK, marginBottom: '18px' }}>New Project</div>
            {error && <div style={{ background: 'rgba(180,83,75,0.1)', color: '#9C463F', fontSize: '12px', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' }}>{error}</div>}
            <div style={{ marginBottom: '13px' }}>
              <label style={lbl}>Project name *</label>
              <input style={inp} placeholder='e.g. Maple St. Whole-Home Remodel' value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '13px' }}>
              <div>
                <label style={lbl}>Client name</label>
                <input style={inp} placeholder='Jane Doe' value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Client email</label>
                <input style={inp} placeholder='jane@email.com' value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '13px' }}>
              <label style={lbl}>Address</label>
              <input style={inp} placeholder='123 Maple St' value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={lbl}>Overall style / feel</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder='Warm modern, natural materials, calm and airy…' value={form.style_summary} onChange={e => setForm(f => ({ ...f, style_summary: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: INK2, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ ...cta, opacity: saving ? 0.6 : 1 }}>{saving ? 'Creating…' : 'Create Project'}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
