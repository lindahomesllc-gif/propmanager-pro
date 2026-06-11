'use client'
import { useState, useEffect } from 'react'

export default function ShareBoardPage({ params }: { params: { token: string } }) {
  const token = params.token
  const [data, setData] = useState<any>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')
  const [clientName, setClientName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [commentFor, setCommentFor] = useState<string>('') // item id
  const [commentText, setCommentText] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/design/board?token=' + encodeURIComponent(token))
      if (!res.ok) { setState('missing'); return }
      setData(await res.json()); setState('ok')
    } catch { setState('missing') }
  }
  useEffect(() => {
    load()
    try { const n = localStorage.getItem('designClientName'); if (n) { setClientName(n); setNameSaved(true) } } catch {}
  }, [token])

  function saveName() {
    if (!clientName.trim()) return
    try { localStorage.setItem('designClientName', clientName.trim()) } catch {}
    setNameSaved(true)
  }

  async function respond(itemId: string, decision: string, comment?: string) {
    if (!nameSaved) { alert('Please add your name first so your designer knows who responded.'); return }
    setBusy(itemId + decision)
    try {
      const res = await fetch('/api/design/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, item_id: itemId, decision, comment: comment || null, client_name: clientName.trim() }),
      })
      if (res.ok) { setCommentFor(''); setCommentText(''); await load() }
      else alert('Could not save your response. Please try again.')
    } catch { alert('Network error. Please try again.') }
    setBusy('')
  }

  if (state === 'loading') return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading…</div>
  if (state === 'missing') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'Plus Jakarta Sans, sans-serif', textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔒</div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text2)' }}>This board isn’t available</div>
      <div style={{ fontSize: '13px', marginTop: '6px' }}>The link may be turned off or incorrect. Ask your designer to re-share it.</div>
    </div>
  )

  const { project, rooms, items, approvals } = data
  const finishes = items.filter((i: any) => i.kind === 'finish')
  const colors = (roomId: string | null) => items.filter((i: any) => i.kind === 'color' && (i.room_id || null) === (roomId || null))
  const inspo = (roomId: string | null) => items.filter((i: any) => i.kind === 'inspiration' && (i.room_id || null) === (roomId || null))
  const latestApproval: Record<string, any> = {}
  approvals.forEach((a: any) => { if (a.item_id && !latestApproval[a.item_id]) latestApproval[a.item_id] = a })
  const buckets = [...rooms.map((r: any) => ({ id: r.id, room: r })), { id: null, room: null }]
  const inpStyle = { width: '100%', padding: '9px 12px', fontSize: '14px', border: '0.5px solid var(--border2)', borderRadius: '8px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text)' }}>
      {/* hero */}
      <div style={{ background: project.cover_image_url ? `center/cover no-repeat url(${project.cover_image_url})` : 'linear-gradient(135deg, var(--green), var(--green-dk))', color: '#fff' }}>
        <div style={{ background: project.cover_image_url ? 'rgba(0,0,0,0.45)' : 'transparent', padding: '40px 24px' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.85 }}>Design Vision Board</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '30px', fontWeight: 800, marginTop: '6px' }}>{project.name}</div>
            {project.address && <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>{project.address}</div>}
            {project.style_summary && <div style={{ fontSize: '15px', marginTop: '14px', maxWidth: '640px', lineHeight: 1.6, fontStyle: 'italic', opacity: 0.95 }}>“{project.style_summary}”</div>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px' }}>
        {/* name gate */}
        <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {nameSaved ? (
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>👋 Reviewing as <b style={{ color: 'var(--text)' }}>{clientName}</b>. Approve, request changes, or comment on any item below — your designer sees it instantly. <button onClick={() => setNameSaved(false)} style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: '13px' }}>change</button></div>
          ) : (
            <>
              <div style={{ fontSize: '13px', color: 'var(--text2)', flexShrink: 0 }}>Your name:</div>
              <input style={{ ...inpStyle, flex: 1, minWidth: '180px' }} placeholder='So your designer knows who responded' value={clientName} onChange={e => setClientName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveName() }} />
              <button onClick={saveName} className='btn btn-primary' style={{ flexShrink: 0 }}>Start reviewing</button>
            </>
          )}
        </div>

        {buckets.map((b: any) => {
          const cols = colors(b.id); const ims = inspo(b.id)
          const fins = finishes.filter((f: any) => (f.room_id || null) === (b.id || null))
          if (!b.room && cols.length === 0 && ims.length === 0 && fins.length === 0) return null
          return (
            <div key={b.id || 'whole'} style={{ marginBottom: '34px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{b.room ? b.room.name : 'Whole-home'}</div>
              {b.room?.feel && <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '14px', maxWidth: '640px', lineHeight: 1.5 }}>{b.room.feel}</div>}

              {/* palette */}
              {cols.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {cols.map((c: any) => <div key={c.id} title={c.color_hex} style={{ width: '40px', height: '40px', borderRadius: '9px', background: c.color_hex, border: '1px solid var(--border2)' }} />)}
                </div>
              )}

              {/* inspiration */}
              {ims.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '10px', marginBottom: '18px' }}>
                  {ims.map((im: any) => (
                    <div key={im.id} style={{ borderRadius: '10px', overflow: 'hidden', aspectRatio: '1', border: '0.5px solid var(--border)' }}>
                      <img src={im.image_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* finishes */}
              {fins.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '14px' }}>
                  {fins.map((f: any) => {
                    const appr = latestApproval[f.id]
                    return (
                      <div key={f.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ height: '150px', background: 'var(--bg3)', position: 'relative' }}>
                          {f.image_url ? <img src={f.image_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : f.color_hex ? <div style={{ position: 'absolute', inset: 0, background: f.color_hex }} />
                              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: '30px' }}>🧱</div>}
                          {appr && <span className={'chip ' + (appr.decision === 'approved' ? 'chip-g' : appr.decision === 'rejected' ? 'chip-r' : 'chip-b')} style={{ position: 'absolute', top: '8px', right: '8px' }}>{appr.decision === 'approved' ? '✓ You approved' : appr.decision === 'rejected' ? '✗ Change requested' : '💬 Commented'}</span>}
                        </div>
                        <div style={{ padding: '13px 15px 15px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 700 }}>{f.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>{[f.category, f.brand].filter(Boolean).join(' · ')}</div>
                          {(f.material || f.dimensions) && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{[f.material, f.dimensions].filter(Boolean).join(' · ')}</div>}
                          {f.notes && <div style={{ fontSize: '12.5px', color: 'var(--text2)', marginTop: '8px', lineHeight: 1.5 }}>{f.notes}</div>}

                          {commentFor === f.id ? (
                            <div style={{ marginTop: '12px' }}>
                              <textarea autoFocus style={{ ...inpStyle, resize: 'vertical', fontSize: '13px' }} rows={2} placeholder='Your comment…' value={commentText} onChange={e => setCommentText(e.target.value)} />
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                <button onClick={() => respond(f.id, 'comment', commentText)} disabled={!commentText.trim() || busy.startsWith(f.id)} className='btn btn-primary' style={{ fontSize: '12px', padding: '6px 12px' }}>Send</button>
                                <button onClick={() => { setCommentFor(''); setCommentText('') }} className='btn btn-ghost' style={{ fontSize: '12px', padding: '6px 12px' }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                              <button onClick={() => respond(f.id, 'approved')} disabled={busy === f.id + 'approved'} className='btn btn-primary' style={{ fontSize: '12px', padding: '6px 12px' }}>👍 Approve</button>
                              <button onClick={() => respond(f.id, 'rejected')} disabled={busy === f.id + 'rejected'} className='btn btn-ghost' style={{ fontSize: '12px', padding: '6px 12px' }}>Request change</button>
                              <button onClick={() => { setCommentFor(f.id); setCommentText('') }} className='btn btn-ghost' style={{ fontSize: '12px', padding: '6px 12px' }}>💬 Comment</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {finishes.length === 0 && rooms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Your designer is still putting this board together. Check back soon.</div>
        )}

        <div style={{ textAlign: 'center', padding: '30px 0 10px', fontSize: '11px', color: 'var(--text3)' }}>Shared securely · responses are private to you and your designer</div>
      </div>
    </div>
  )
}
