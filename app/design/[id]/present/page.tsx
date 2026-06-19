'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const CREAM = '#F6F1E8', INK = '#3D362E', INK2 = '#7C7264', FAINT = '#A99E8E', LINE = 'rgba(61,54,46,0.12)', ACCENT = '#A78A5E', SERIF = "'Cormorant Garamond', serif"

export default function PresentPage({ params }: { params: { id: string } }) {
  const pid = params.id
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [{ data: project }, { data: rooms }, { data: items }] = await Promise.all([
        supabase.from('design_projects').select('*').eq('id', pid).maybeSingle(),
        supabase.from('design_rooms').select('*').eq('project_id', pid).order('sort_order').order('created_at'),
        supabase.from('design_items').select('*').eq('project_id', pid).order('sort_order').order('created_at'),
      ])
      setData({ project, rooms: rooms || [], items: items || [] })
      setLoading(false)
    })()
  }, [pid])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CREAM, color: INK2, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Preparing presentation…</div>
  if (!data?.project) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CREAM, color: INK2, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Project not found. Open this from the Design Studio while signed in.</div>

  const { project, rooms, items } = data
  const finishes = items.filter((i: any) => i.kind === 'finish')
  const colors = (rid: string | null) => items.filter((i: any) => i.kind === 'color' && (i.room_id || null) === (rid || null))
  const inspo = (rid: string | null) => items.filter((i: any) => i.kind === 'inspiration' && (i.room_id || null) === (rid || null))
  const finImgs = (f: any) => (Array.isArray(f.image_urls) && f.image_urls.length ? f.image_urls : (f.image_url ? [f.image_url] : []))
  const buckets = [...rooms.map((r: any) => ({ id: r.id, room: r })), { id: null, room: null }]
  const c = project.concept || {}
  const eyebrow: any = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: FAINT }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, color: INK, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', background: 'rgba(246,241,232,0.9)', borderBottom: '1px solid ' + LINE, backdropFilter: 'blur(6px)' }}>
        <a href={'/design/' + pid} style={{ fontSize: '12px', color: INK2, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>← Back</a>
        <button onClick={() => { try { (document.documentElement as any).requestFullscreen?.() } catch {} }} style={{ background: 'transparent', border: '1px solid ' + LINE, borderRadius: '4px', padding: '6px 14px', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK2, cursor: 'pointer' }}>⛶ Full screen</button>
      </div>

      {/* cover */}
      <section style={{ position: 'relative', minHeight: '74vh', display: 'flex', alignItems: 'flex-end', background: project.cover_image_url ? `center/cover no-repeat url(${project.cover_image_url})` : 'linear-gradient(135deg, #EFE7D8, #C9B79A)' }}>
        {project.cover_image_url && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(40,35,28,0.55))' }} />}
        <div style={{ position: 'relative', padding: '48px', color: project.cover_image_url ? '#fff' : INK, maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
          <div style={{ ...eyebrow, color: project.cover_image_url ? 'rgba(255,255,255,0.85)' : FAINT }}>Interior Design · Presentation</div>
          <div style={{ fontFamily: SERIF, fontSize: '64px', fontWeight: 600, lineHeight: 1, marginTop: '12px' }}>{project.name}</div>
          {(project.address || project.client_name) && <div style={{ fontSize: '15px', marginTop: '10px', opacity: 0.92 }}>{[project.client_name, project.address].filter(Boolean).join('  ·  ')}</div>}
        </div>
      </section>

      {/* concept */}
      {(c.story || project.style_summary || c.moodWords) && (
        <section style={{ maxWidth: '820px', margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
          <div style={eyebrow}>The vision</div>
          {(c.story || project.style_summary) && <div style={{ fontFamily: SERIF, fontSize: '30px', fontStyle: 'italic', fontWeight: 500, lineHeight: 1.4, color: INK, marginTop: '16px' }}>“{c.story || project.style_summary}”</div>}
          {c.moodWords && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '22px' }}>{c.moodWords.split(/[,·]/).map((w: string) => w.trim()).filter(Boolean).map((w: string) => <span key={w} style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: '20px', border: '1px solid ' + ACCENT, color: ACCENT }}>{w}</span>)}</div>}
        </section>
      )}

      {/* rooms */}
      {buckets.map((b: any) => {
        const cols = colors(b.id), ims = inspo(b.id)
        const fins = finishes.filter((f: any) => (f.room_id || null) === (b.id || null))
        if (!b.room && cols.length === 0 && ims.length === 0 && fins.length === 0) return null
        return (
          <section key={b.id || 'whole'} style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 32px', borderTop: '1px solid ' + LINE }}>
            <div style={{ fontFamily: SERIF, fontSize: '36px', fontWeight: 600, color: INK }}>{b.room ? b.room.name : 'Whole-home'}{b.room?.area ? <span style={{ fontSize: '14px', color: FAINT }}>  ·  {b.room.area}</span> : ''}</div>
            {b.room?.feel && <div style={{ fontSize: '15px', color: INK2, marginTop: '8px', maxWidth: '680px', lineHeight: 1.6 }}>{b.room.feel}</div>}

            {cols.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                {cols.map((c2: any) => <div key={c2.id} title={c2.color_hex} style={{ width: '52px', height: '52px', borderRadius: '10px', background: c2.color_hex, border: '1px solid ' + LINE }} />)}
              </div>
            )}

            {ims.length > 0 && (
              <div style={{ columnWidth: '230px', columnGap: '14px', marginTop: '24px' }}>
                {ims.map((im: any) => (
                  <div key={im.id} style={{ breakInside: 'avoid', WebkitColumnBreakInside: 'avoid', marginBottom: '14px', borderRadius: '10px', overflow: 'hidden', border: '1px solid ' + LINE, background: '#fff' }}>
                    <img src={im.image_url} alt='' style={{ width: '100%', height: 'auto', display: 'block' }} />
                    {im.notes && <div style={{ padding: '9px 12px', fontSize: '13px', color: INK2, lineHeight: 1.45 }}>{im.notes}</div>}
                  </div>
                ))}
              </div>
            )}

            {fins.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: '16px', marginTop: '26px' }}>
                {fins.map((f: any) => {
                  const cover = finImgs(f)[0]
                  return (
                    <div key={f.id} style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ height: '160px', background: cover ? '#EFE7D8' : (f.color_hex || '#EFE7D8') }}>{cover && <img src={cover} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontFamily: SERIF, fontSize: '19px', fontWeight: 600, lineHeight: 1.1, color: INK }}>{f.name}</div>
                        <div style={{ fontSize: '11px', color: FAINT, marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{[f.category, f.brand].filter(Boolean).join('  ·  ')}</div>
                        {f.notes && <div style={{ fontSize: '12.5px', color: INK2, marginTop: '7px', lineHeight: 1.5 }}>{f.notes}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      <div style={{ textAlign: 'center', padding: '50px 0 60px', fontSize: '11px', color: FAINT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{project.name}</div>
    </div>
  )
}
