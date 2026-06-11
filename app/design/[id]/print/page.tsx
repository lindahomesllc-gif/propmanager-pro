'use client'
import { useState, useEffect } from 'react'
import { supabase, fm, formatDate } from '@/lib/supabase'

const INK = '#1A1A18', MUTE = '#5A5A56', FAINT = '#9A9A96', LINE = '#E4E4E0', GREEN = '#0E9C9C'
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  idea: { label: 'Idea', bg: '#EFEFEC', fg: '#5A5A56' },
  proposed: { label: 'Proposed', bg: '#E7EEFB', fg: '#2563EB' },
  approved: { label: 'Approved', bg: '#E4F0EA', fg: '#2D6A4F' },
  rejected: { label: 'Rejected', bg: '#FBE9E9', fg: '#DC2626' },
  ordered: { label: 'Ordered', bg: '#FBF0E1', fg: '#B45309' },
  installed: { label: 'Installed', bg: '#E4F0EA', fg: '#2D6A4F' },
}

export default function DesignPrintPage({ params }: { params: { id: string } }) {
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
      let property = null
      if (project?.property_id) {
        const { data: p } = await supabase.from('properties').select('id, address, market_value, purchase_price').eq('id', project.property_id).maybeSingle()
        property = p
      }
      setData({ project, rooms: rooms || [], items: items || [], property })
      setLoading(false)
    })()
  }, [pid])

  if (loading) return <div style={{ padding: '40px', fontFamily: 'Plus Jakarta Sans, sans-serif', color: MUTE }}>Preparing document…</div>
  if (!data?.project) return <div style={{ padding: '40px', fontFamily: 'Plus Jakarta Sans, sans-serif', color: MUTE }}>Project not found. Open this from the Design Studio while signed in.</div>

  const { project, rooms, items, property } = data
  const finishes = items.filter((i: any) => i.kind === 'finish')
  const colors = (rid: string | null) => items.filter((i: any) => i.kind === 'color' && (i.room_id || null) === (rid || null))
  const inspo = (rid: string | null) => items.filter((i: any) => i.kind === 'inspiration' && (i.room_id || null) === (rid || null))
  const lineEst = (f: any) => { const s = Number(f.sqft) || 0; const base = s > 0 ? s : (f.qty == null || f.qty === '' ? 1 : Number(f.qty) || 0); return (Number(f.price) || 0) * base }
  const lineAllIn = (f: any) => (f.actual_cost != null ? Number(f.actual_cost) || 0 : lineEst(f))
  const allIn = finishes.reduce((s: number, f: any) => s + lineAllIn(f), 0)
  const estTotal = finishes.reduce((s: number, f: any) => s + lineEst(f), 0)
  const budget = project.budget_total != null ? Number(project.budget_total) : null
  const propValue = property ? (Number(property.market_value) || Number(property.purchase_price) || 0) : 0
  const arv = project.arv != null ? Number(project.arv) : null
  const netCreated = arv != null ? arv - propValue - allIn : null
  const roiReno = arv != null && allIn > 0 ? (netCreated as number) / allIn * 100 : null
  const buckets = [...rooms.map((r: any) => ({ id: r.id, room: r })), { id: null, room: null }]

  const summary = [
    budget != null ? { k: 'Budget', v: fm(budget) } : null,
    { k: 'Estimated', v: fm(estTotal) },
    finishes.some((f: any) => f.actual_cost != null) ? { k: 'Actual spent', v: fm(finishes.reduce((s: number, f: any) => s + (f.actual_cost != null ? Number(f.actual_cost) || 0 : 0), 0)) } : null,
    arv != null ? { k: 'Projected ARV', v: fm(arv) } : null,
    netCreated != null ? { k: 'Value created', v: fm(netCreated) } : null,
    roiReno != null ? { k: 'Return on reno', v: Math.round(roiReno) + '%' } : null,
  ].filter(Boolean) as { k: string; v: string }[]

  const th: any = { textAlign: 'left', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: FAINT, padding: '0 8px 6px', borderBottom: '1px solid ' + LINE }
  const td: any = { fontSize: '11px', color: INK, padding: '8px', borderBottom: '1px solid ' + LINE, verticalAlign: 'top' }

  return (
    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: INK, background: '#fff', minHeight: '100vh' }}>
      <style>{`@media print { .no-print { display: none !important } .room, tr, .fcard { break-inside: avoid } } @page { margin: 14mm }`}</style>

      <div className='no-print' style={{ position: 'sticky', top: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#fff', borderBottom: '1px solid ' + LINE, zIndex: 10 }}>
        <a href={'/design/' + pid} style={{ fontSize: '13px', color: MUTE, textDecoration: 'none' }}>← Back to project</a>
        <button onClick={() => window.print()} style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>⤓ Save as PDF</button>
      </div>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 28px 60px' }}>
        {/* header */}
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GREEN }}>Design Studio · Finishes Schedule</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '30px', fontWeight: 800, margin: '6px 0 4px' }}>{project.name}</h1>
        <div style={{ fontSize: '13px', color: MUTE }}>{[project.client_name, property?.address || project.address].filter(Boolean).join(' · ')}</div>
        {project.style_summary && <div style={{ fontSize: '14px', color: INK, fontStyle: 'italic', marginTop: '12px', lineHeight: 1.6, maxWidth: '620px' }}>“{project.style_summary}”</div>}
        <div style={{ fontSize: '11px', color: FAINT, marginTop: '10px' }}>Prepared {formatDate(new Date().toISOString())}</div>

        {project.cover_image_url && (
          <img src={project.cover_image_url} alt='' style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '10px', marginTop: '18px' }} />
        )}

        {/* budget / ROI */}
        {summary.length > 0 && (
          <div style={{ marginTop: '26px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: FAINT, marginBottom: '10px' }}>Budget &amp; return</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))', gap: '10px' }}>
              {summary.map((m, i) => (
                <div key={i} style={{ border: '1px solid ' + LINE, borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: FAINT }}>{m.k}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '3px' }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* rooms */}
        {buckets.map((b: any) => {
          const cols = colors(b.id), ims = inspo(b.id)
          const fins = finishes.filter((f: any) => (f.room_id || null) === (b.id || null))
          if (!b.room && cols.length === 0 && ims.length === 0 && fins.length === 0) return null
          return (
            <div key={b.id || 'whole'} className='room' style={{ marginTop: '30px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '19px', fontWeight: 700, borderBottom: '2px solid ' + GREEN, paddingBottom: '6px' }}>{b.room ? b.room.name : 'Whole-home'}</div>
              {b.room?.feel && <div style={{ fontSize: '13px', color: MUTE, marginTop: '8px', lineHeight: 1.5 }}>{b.room.feel}</div>}

              {cols.length > 0 && (
                <div style={{ display: 'flex', gap: '7px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {cols.map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: c.color_hex, border: '1px solid ' + LINE }} />
                      <span style={{ fontSize: '9px', color: FAINT }}>{c.color_hex}</span>
                    </div>
                  ))}
                </div>
              )}

              {ims.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {ims.slice(0, 6).map((im: any) => (
                    <img key={im.id} src={im.image_url} alt='' style={{ width: '92px', height: '92px', objectFit: 'cover', borderRadius: '7px', border: '1px solid ' + LINE }} />
                  ))}
                </div>
              )}

              {fins.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '14px' }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: '52px' }}></th>
                      <th style={th}>Item</th>
                      <th style={th}>Details</th>
                      <th style={{ ...th, textAlign: 'right', width: '44px' }}>Qty</th>
                      <th style={{ ...th, textAlign: 'right', width: '72px' }}>Cost</th>
                      <th style={{ ...th, width: '74px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fins.map((f: any) => {
                      const st = STATUS[f.status] || STATUS.idea
                      return (
                        <tr key={f.id}>
                          <td style={td}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '6px', border: '1px solid ' + LINE, background: f.image_url ? `center/cover no-repeat url(${f.image_url})` : (f.color_hex || '#EFEFEC') }} />
                          </td>
                          <td style={td}>
                            <div style={{ fontWeight: 700 }}>{f.name}</div>
                            <div style={{ fontSize: '10px', color: FAINT, marginTop: '2px' }}>{[f.category, f.brand].filter(Boolean).join(' · ')}</div>
                          </td>
                          <td style={{ ...td, color: MUTE, fontSize: '10px' }}>
                            {[f.material, f.dimensions, Number(f.sqft) > 0 ? f.sqft + ' SF' : null, f.color_hex].filter(Boolean).join(' · ')}
                            {f.supplier && <div style={{ marginTop: '2px' }}>{f.supplier}</div>}
                          </td>
                          <td style={{ ...td, textAlign: 'right' }}>{Number(f.sqft) > 0 ? f.sqft + ' SF' : (f.qty != null ? f.qty : 1)}</td>
                          <td style={{ ...td, textAlign: 'right' }}>
                            <div style={{ fontWeight: 700 }}>{fm(lineAllIn(f))}</div>
                            {f.actual_cost != null && <div style={{ fontSize: '8.5px', color: GREEN }}>actual</div>}
                          </td>
                          <td style={td}>
                            <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', background: st.bg, color: st.fg, whiteSpace: 'nowrap' }}>{st.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td style={{ ...td, borderBottom: 'none' }}></td>
                      <td style={{ ...td, borderBottom: 'none', fontWeight: 700, color: MUTE }} colSpan={3}>Room total</td>
                      <td style={{ ...td, borderBottom: 'none', textAlign: 'right', fontWeight: 800 }}>{fm(fins.reduce((s: number, f: any) => s + lineAllIn(f), 0))}</td>
                      <td style={{ ...td, borderBottom: 'none' }}></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )
        })}

        {finishes.length > 0 && (
          <div style={{ marginTop: '26px', paddingTop: '14px', borderTop: '2px solid ' + INK, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700 }}>Project total ({finishes.length} item{finishes.length === 1 ? '' : 's'})</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{fm(allIn)}</div>
          </div>
        )}

        <div style={{ marginTop: '40px', fontSize: '10px', color: FAINT, textAlign: 'center' }}>Generated by PropManager Pro · Design Studio</div>
      </div>
    </div>
  )
}
