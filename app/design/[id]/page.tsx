'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate } from '@/lib/supabase'

const CATEGORIES = ['Tile', 'Paint', 'Flooring', 'Cabinetry', 'Countertop', 'Fixture', 'Lighting', 'Hardware', 'Appliance', 'Plumbing', 'Textile', 'Furniture', 'Wallpaper', 'Window', 'Other']
const STATUSES: { v: string; label: string; chip: string }[] = [
  { v: 'idea', label: 'Idea', chip: 'chip-x' },
  { v: 'proposed', label: 'Proposed', chip: 'chip-b' },
  { v: 'approved', label: 'Approved', chip: 'chip-g' },
  { v: 'rejected', label: 'Rejected', chip: 'chip-r' },
  { v: 'ordered', label: 'Ordered', chip: 'chip-a' },
  { v: 'installed', label: 'Installed', chip: 'chip-g' },
]
const statusMeta = (v: string) => STATUSES.find(s => s.v === v) || STATUSES[0]

const emptyFinish = { id: '', room_id: '', category: 'Tile', name: '', brand: '', color_hex: '', material: '', dimensions: '', price: '', qty: '', actual_cost: '', supplier: '', supplier_url: '', image_url: '', status: 'idea', notes: '' }

export default function DesignProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const pid = params.id
  const [project, setProject] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'moodboard' | 'finishes' | 'budget' | 'decisions' | 'share'>('moodboard')
  const [notFound, setNotFound] = useState(false)

  // modals / editors
  const [finishModal, setFinishModal] = useState<any>(null) // form object or null
  const [savingFinish, setSavingFinish] = useState(false)
  const [finishErr, setFinishErr] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [roomModal, setRoomModal] = useState<any>(null)
  const [settingsModal, setSettingsModal] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [finishFilter, setFinishFilter] = useState('')
  const [copied, setCopied] = useState(false)
  const [uploadingFor, setUploadingFor] = useState('') // roomId or 'finish' or 'cover'
  const finishFileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [{ data: proj }, { data: rms }, { data: its }, { data: act }, { data: appr }, { data: props }] = await Promise.all([
      supabase.from('design_projects').select('*').eq('id', pid).maybeSingle(),
      supabase.from('design_rooms').select('*').eq('project_id', pid).order('sort_order').order('created_at'),
      supabase.from('design_items').select('*').eq('project_id', pid).order('sort_order').order('created_at'),
      supabase.from('design_activity').select('*').eq('project_id', pid).order('created_at', { ascending: false }),
      supabase.from('design_approvals').select('*').eq('project_id', pid).order('created_at', { ascending: false }),
      supabase.from('properties').select('id, address, market_value, purchase_price').order('address'),
    ])
    if (!proj) { setNotFound(true); setLoading(false); return }
    setProject(proj); setRooms(rms || []); setItems(its || []); setActivity(act || []); setApprovals(appr || []); setProperties(props || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [pid])

  async function logActivity(text: string, kind: string, item_id?: string) {
    await supabase.from('design_activity').insert({ project_id: pid, text, kind, item_id: item_id || null, author: 'you' })
  }

  async function uploadImage(file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    const path = (user?.id || 'unknown') + '/design/' + pid + '/' + Date.now() + '_' + file.name.replace(/[^\w.\-]/g, '_')
    const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); return null }
    return supabase.storage.from('lease-documents').getPublicUrl(path).data.publicUrl
  }

  // ---------- rooms ----------
  async function saveRoom() {
    if (!roomModal?.name?.trim()) return
    const payload = { name: roomModal.name.trim(), feel: roomModal.feel?.trim() || null }
    if (roomModal.id) {
      await supabase.from('design_rooms').update(payload).eq('id', roomModal.id)
    } else {
      await supabase.from('design_rooms').insert({ ...payload, project_id: pid, sort_order: rooms.length })
    }
    setRoomModal(null); load()
  }
  async function deleteRoom(r: any) {
    if (!confirm('Delete room “' + r.name + '”? Items in it will move to Whole-home.')) return
    await supabase.from('design_rooms').delete().eq('id', r.id)
    load()
  }

  // ---------- finishes ----------
  function openFinish(roomId: string | null, existing?: any) {
    setFinishErr(''); setImportUrl('')
    if (existing) setFinishModal({ ...emptyFinish, ...existing, price: existing.price ?? '', qty: existing.qty ?? '', actual_cost: existing.actual_cost ?? '', room_id: existing.room_id || '' })
    else setFinishModal({ ...emptyFinish, room_id: roomId || '' })
  }
  async function importFromUrl() {
    const url = importUrl.trim()
    if (!url) return
    setImporting(true); setFinishErr('')
    try {
      const res = await fetch('/api/design/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const d = await res.json()
      if (!res.ok) { setFinishErr(d?.error === 'invalid_url' ? 'That doesn’t look like a valid product link.' : 'Couldn’t read that page — just fill the fields in below.'); setImporting(false); return }
      setFinishModal((m: any) => ({
        ...m,
        name: m.name || d.name || '',
        image_url: d.image || m.image_url,
        price: (m.price === '' || m.price == null) && d.price != null ? String(d.price) : m.price,
        brand: m.brand || d.brand || '',
        supplier: m.supplier || d.site || '',
        supplier_url: url,
      }))
      if (!d.name && !d.image && d.price == null) setFinishErr('That page didn’t expose product details — fill in what’s missing below.')
    } catch { setFinishErr('Network error — try again or fill in manually.') }
    setImporting(false)
  }
  async function saveFinish() {
    if (!finishModal.name?.trim()) { setFinishErr('Give this finish a name'); return }
    setSavingFinish(true); setFinishErr('')
    const numOrNull = (v: any) => v === '' || v == null ? null : Number(v)
    const payload: any = {
      kind: 'finish', room_id: finishModal.room_id || null, category: finishModal.category || null,
      name: finishModal.name.trim(), brand: finishModal.brand?.trim() || null, color_hex: finishModal.color_hex?.trim() || null,
      material: finishModal.material?.trim() || null, dimensions: finishModal.dimensions?.trim() || null,
      price: numOrNull(finishModal.price), qty: numOrNull(finishModal.qty), actual_cost: numOrNull(finishModal.actual_cost),
      supplier: finishModal.supplier?.trim() || null, supplier_url: finishModal.supplier_url?.trim() || null,
      image_url: finishModal.image_url?.trim() || null, status: finishModal.status || 'idea', notes: finishModal.notes?.trim() || null,
    }
    if (finishModal.id) {
      const prev = items.find(i => i.id === finishModal.id)
      const { error: err } = await supabase.from('design_items').update(payload).eq('id', finishModal.id)
      if (err) { setFinishErr(err.message); setSavingFinish(false); return }
      if (prev && prev.status !== payload.status) await logActivity(payload.name + ': ' + statusMeta(prev.status).label + ' → ' + statusMeta(payload.status).label, 'status', finishModal.id)
    } else {
      const { data, error: err } = await supabase.from('design_items').insert({ ...payload, project_id: pid, sort_order: items.length }).select().single()
      if (err) { setFinishErr(err.message); setSavingFinish(false); return }
      await logActivity('Added “' + payload.name + '”' + (payload.category ? ' (' + payload.category + ')' : ''), 'change', data?.id)
    }
    setSavingFinish(false); setFinishModal(null); load()
  }
  async function deleteFinish(it: any) {
    if (!confirm('Delete “' + it.name + '”?')) return
    await supabase.from('design_items').delete().eq('id', it.id)
    await logActivity('Removed “' + it.name + '”', 'change')
    load()
  }
  async function quickStatus(it: any, status: string) {
    await supabase.from('design_items').update({ status }).eq('id', it.id)
    await logActivity(it.name + ': ' + statusMeta(it.status).label + ' → ' + statusMeta(status).label, 'status', it.id)
    load()
  }

  // ---------- inspiration & color ----------
  async function addInspiration(roomId: string | null, file: File) {
    setUploadingFor(roomId || 'whole')
    const url = await uploadImage(file)
    if (url) await supabase.from('design_items').insert({ project_id: pid, room_id: roomId, kind: 'inspiration', image_url: url, sort_order: items.length })
    setUploadingFor(''); load()
  }
  async function addColor(roomId: string | null, hex: string) {
    await supabase.from('design_items').insert({ project_id: pid, room_id: roomId, kind: 'color', color_hex: hex, sort_order: items.length })
    load()
  }
  async function deleteItem(id: string) {
    await supabase.from('design_items').delete().eq('id', id)
    load()
  }

  // ---------- decisions ----------
  async function addNote() {
    if (!noteText.trim()) return
    await logActivity(noteText.trim(), 'decision')
    setNoteText(''); load()
  }

  // ---------- share / settings ----------
  async function toggleShare() {
    const next = !project.share_enabled
    await supabase.from('design_projects').update({ share_enabled: next }).eq('id', pid)
    setProject((p: any) => ({ ...p, share_enabled: next }))
  }
  const shareUrl = project ? (typeof window !== 'undefined' ? window.location.origin : '') + '/share/' + project.share_token : ''
  function copyShare() {
    navigator.clipboard?.writeText(shareUrl)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  async function saveSettings() {
    const numOrNull = (v: any) => v === '' || v == null ? null : Number(v)
    const payload: any = {
      name: settingsModal.name?.trim() || project.name,
      client_name: settingsModal.client_name?.trim() || null,
      client_email: settingsModal.client_email?.trim() || null,
      address: settingsModal.address?.trim() || null,
      style_summary: settingsModal.style_summary?.trim() || null,
      property_id: settingsModal.property_id || null,
      budget_total: numOrNull(settingsModal.budget_total),
      arv: numOrNull(settingsModal.arv),
      rent_uplift: numOrNull(settingsModal.rent_uplift),
    }
    if (settingsModal._coverFile) {
      const url = await uploadImage(settingsModal._coverFile)
      if (url) payload.cover_image_url = url
    }
    await supabase.from('design_projects').update(payload).eq('id', pid)
    setSettingsModal(null); load()
  }
  async function toggleArchive() {
    const next = project.status === 'archived' ? 'active' : 'archived'
    if (!confirm(next === 'archived' ? 'Archive this project?' : 'Restore this project?')) return
    await supabase.from('design_projects').update({ status: next }).eq('id', pid)
    setProject((p: any) => ({ ...p, status: next }))
  }
  async function deleteProject() {
    if (!confirm('Permanently delete this project and everything in it? This cannot be undone.')) return
    await supabase.from('design_projects').delete().eq('id', pid)
    router.push('/design')
  }

  // ---------- derived ----------
  const finishes = items.filter(i => i.kind === 'finish')
  const latestApprovalByItem: Record<string, any> = {}
  approvals.forEach(a => { if (a.item_id && !latestApprovalByItem[a.item_id]) latestApprovalByItem[a.item_id] = a })
  const buckets = [...rooms.map(r => ({ id: r.id, room: r })), { id: null as any, room: null }]
  const itemsIn = (roomId: string | null, kind: string) => items.filter(i => i.kind === kind && (i.room_id || null) === (roomId || null))

  // ---------- budget & ROI ----------
  const lineEst = (f: any) => (Number(f.price) || 0) * (f.qty == null ? 1 : Number(f.qty) || 0)
  const lineAllIn = (f: any) => (f.actual_cost != null ? Number(f.actual_cost) || 0 : lineEst(f))
  const estTotal = finishes.reduce((s, f) => s + lineEst(f), 0)
  const actualTotal = finishes.reduce((s, f) => s + (f.actual_cost != null ? Number(f.actual_cost) || 0 : 0), 0)
  const allIn = finishes.reduce((s, f) => s + lineAllIn(f), 0)
  const budget = project?.budget_total != null ? Number(project.budget_total) : null
  const remaining = budget != null ? budget - allIn : null
  const linkedProperty = properties.find(p => p.id === project?.property_id) || null
  const propValue = linkedProperty ? (Number(linkedProperty.market_value) || Number(linkedProperty.purchase_price) || 0) : 0
  const arv = project?.arv != null ? Number(project.arv) : null
  const valueUplift = arv != null && propValue > 0 ? arv - propValue : null
  const netCreated = arv != null ? arv - propValue - allIn : null
  const roiReno = arv != null && allIn > 0 ? (netCreated as number) / allIn * 100 : null
  const rentUpliftMo = project?.rent_uplift != null ? Number(project.rent_uplift) : null
  const rentYield = rentUpliftMo && allIn > 0 ? (rentUpliftMo * 12) / allIn * 100 : null
  const roomCost = (roomId: string | null) => {
    const fs = finishes.filter(f => (f.room_id || null) === (roomId || null))
    return { n: fs.length, est: fs.reduce((s, f) => s + lineEst(f), 0), actual: fs.reduce((s, f) => s + (f.actual_cost != null ? Number(f.actual_cost) || 0 : 0), 0) }
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const tabBtn = (t: string, label: string) => (
    <button onClick={() => setTab(t as any)} style={{
      padding: '7px 14px', fontSize: '12.5px', fontWeight: tab === t ? 700 : 500, cursor: 'pointer',
      background: 'transparent', border: 'none', color: tab === t ? 'var(--green)' : 'var(--text2)',
      borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent', fontFamily: 'inherit',
    }}>{label}</button>
  )

  if (notFound) return (
    <AppShell><div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
      <div style={{ fontSize: '15px', marginBottom: '12px' }}>Project not found.</div>
      <a href='/design' className='btn btn-ghost'>← Back to Design Studio</a>
    </div></AppShell>
  )

  return (
    <AppShell>
      {/* header */}
      <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <a href='/design' style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Design Studio</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{project?.name || '…'}</div>
              {project?.status === 'archived' && <span className='chip chip-x'>Archived</span>}
              {project?.share_enabled && <span className='chip chip-g'>🔗 Shared</span>}
            </div>
            {project && (project.client_name || project.address) && (
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{[project.client_name, project.address].filter(Boolean).join(' · ')}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => setSettingsModal({ ...project })} className='btn btn-ghost' style={{ fontSize: '11px', padding: '6px 12px' }}>⚙ Settings</button>
            <button onClick={() => openFinish(null)} className='btn btn-primary' style={{ fontSize: '11px', padding: '6px 12px' }}>+ Add Finish</button>
          </div>
        </div>
        {project?.style_summary && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '8px', fontStyle: 'italic', maxWidth: '720px' }}>“{project.style_summary}”</div>}
        <div style={{ display: 'flex', gap: '4px', marginTop: '10px', borderBottom: '0', marginBottom: '-12px' }}>
          {tabBtn('moodboard', '🖼 Moodboard')}
          {tabBtn('finishes', '🧱 Finishes' + (finishes.length ? ' (' + finishes.length + ')' : ''))}
          {tabBtn('budget', '💰 Budget & ROI')}
          {tabBtn('decisions', '📝 Decisions')}
          {tabBtn('share', '🔗 Share' + (approvals.length ? ' (' + approvals.length + ')' : ''))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'grid', gap: '10px' }}>{[0, 1, 2].map(i => <div key={i} className='skeleton' style={{ height: '90px' }} />)}</div>
        ) : (
          <>
            {/* ============ MOODBOARD ============ */}
            {tab === 'moodboard' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Capture the feel of each room — colors, materials, and inspiration photos.</div>
                  <button onClick={() => setRoomModal({ name: '', feel: '' })} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>+ Add Room</button>
                </div>
                {buckets.map(b => {
                  const colors = itemsIn(b.id, 'color')
                  const inspo = itemsIn(b.id, 'inspiration')
                  const roomFinishes = finishes.filter(f => (f.room_id || null) === (b.id || null))
                  if (!b.room && colors.length === 0 && inspo.length === 0 && roomFinishes.length === 0) return null
                  return (
                    <div key={b.id || 'whole'} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{b.room ? b.room.name : '🏠 Whole-home'}</div>
                          {b.room?.feel && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '3px', maxWidth: '600px' }}>{b.room.feel}</div>}
                        </div>
                        {b.room && (
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button onClick={() => setRoomModal({ ...b.room })} className='btn btn-ghost' style={{ fontSize: '10px', padding: '4px 9px' }}>Edit</button>
                            <button onClick={() => deleteRoom(b.room)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '4px 9px', fontSize: '10px', cursor: 'pointer' }}>Delete</button>
                          </div>
                        )}
                      </div>

                      {/* colors */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {colors.map(c => (
                          <div key={c.id} title={c.color_hex} onClick={() => { if (confirm('Remove this swatch?')) deleteItem(c.id) }} style={{ width: '34px', height: '34px', borderRadius: '8px', background: c.color_hex || '#ccc', border: '1px solid var(--border2)', cursor: 'pointer' }} />
                        ))}
                        <label style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text3)', fontSize: '16px', position: 'relative' }} title='Add color swatch'>
                          +
                          <input type='color' style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => addColor(b.id, e.target.value)} />
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>palette</span>
                      </div>

                      {/* inspiration */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: '8px', marginTop: '12px' }}>
                        {inspo.map(im => (
                          <div key={im.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', border: '0.5px solid var(--border)' }}>
                            <img src={im.image_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <button onClick={() => { if (confirm('Remove this image?')) deleteItem(im.id) }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '6px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                        <label style={{ aspectRatio: '1', borderRadius: '8px', border: '1px dashed var(--border2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text3)', fontSize: '12px', textAlign: 'center', padding: '6px' }}>
                          {uploadingFor === (b.id || 'whole') ? 'Uploading…' : <><div style={{ fontSize: '20px' }}>＋</div>Add photo</>}
                          <input type='file' accept='image/*' style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) addInspiration(b.id, f); e.currentTarget.value = '' }} />
                        </label>
                      </div>

                      {roomFinishes.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px' }}>
                          {roomFinishes.length} finish{roomFinishes.length === 1 ? '' : 'es'} · <span onClick={() => setTab('finishes')} style={{ color: 'var(--green)', cursor: 'pointer' }}>view in Finishes →</span>
                        </div>
                      )}
                    </div>
                  )
                })}
                {rooms.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)', fontSize: '13px' }}>Add a room to start building the moodboard.</div>
                )}
              </div>
            )}

            {/* ============ FINISHES ============ */}
            {tab === 'finishes' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
                  <select value={finishFilter} onChange={e => setFinishFilter(e.target.value)} style={{ ...inp, width: 'auto', minWidth: '160px' }}>
                    <option value=''>All rooms</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    <option value='__none'>Whole-home / Unassigned</option>
                  </select>
                  <button onClick={() => openFinish(finishFilter && finishFilter !== '__none' ? finishFilter : null)} className='btn btn-primary' style={{ fontSize: '11px', padding: '6px 12px' }}>+ Add Finish</button>
                </div>
                {finishes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
                    <div style={{ fontSize: '30px', marginBottom: '8px' }}>🧱</div>
                    <div style={{ fontSize: '13px', marginBottom: '12px' }}>No finishes logged yet — tiles, paint, fixtures, flooring…</div>
                    <button onClick={() => openFinish(null)} className='btn btn-primary'>+ Add your first finish</button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: '12px' }}>
                    {finishes
                      .filter(f => !finishFilter || (finishFilter === '__none' ? !f.room_id : f.room_id === finishFilter))
                      .map(f => {
                        const sm = statusMeta(f.status)
                        const appr = latestApprovalByItem[f.id]
                        const roomName = rooms.find(r => r.id === f.room_id)?.name
                        return (
                          <div key={f.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ height: '120px', background: 'var(--bg3)', position: 'relative' }}>
                              {f.image_url
                                ? <img src={f.image_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: '26px' }}>{f.color_hex ? '' : '🧱'}</div>}
                              {!f.image_url && f.color_hex && <div style={{ position: 'absolute', inset: 0, background: f.color_hex }} />}
                              <span className={'chip ' + sm.chip} style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '9px' }}>{sm.label}</span>
                              {appr && <span className={'chip ' + (appr.decision === 'approved' ? 'chip-g' : appr.decision === 'rejected' ? 'chip-r' : 'chip-b')} style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px' }}>{appr.decision === 'approved' ? '✓ Client' : appr.decision === 'rejected' ? '✗ Client' : '💬 Client'}</span>}
                            </div>
                            <div style={{ padding: '11px 13px 13px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>{f.name}</div>
                                {(f.price != null || f.actual_cost != null) && (
                                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)' }}>{fm(lineAllIn(f))}</div>
                                    {f.actual_cost != null && <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--green)' }}>actual</div>}
                                    {f.actual_cost == null && f.qty != null && Number(f.qty) !== 1 && <div style={{ fontSize: '9px', color: 'var(--text3)' }}>{f.qty}× {fm(f.price)}</div>}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>
                                {[f.category, roomName, f.brand].filter(Boolean).join(' · ')}
                              </div>
                              {(f.material || f.dimensions) && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{[f.material, f.dimensions].filter(Boolean).join(' · ')}</div>}
                              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <select value={f.status} onChange={e => quickStatus(f, e.target.value)} style={{ fontSize: '11px', padding: '3px 6px', border: '0.5px solid var(--border2)', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--text)' }}>
                                  {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
                                </select>
                                {f.supplier_url && <a href={f.supplier_url} target='_blank' className='btn btn-ghost' style={{ fontSize: '10px', padding: '3px 8px' }}>🔗 Source</a>}
                                <button onClick={() => openFinish(f.room_id, f)} className='btn btn-ghost' style={{ fontSize: '10px', padding: '3px 8px' }}>Edit</button>
                                <button onClick={() => deleteFinish(f)} style={{ background: 'transparent', color: 'var(--red)', border: 'none', fontSize: '10px', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}

            {/* ============ BUDGET & ROI ============ */}
            {tab === 'budget' && (
              <div style={{ display: 'grid', gap: '20px', maxWidth: '860px' }}>
                {/* budget summary */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Renovation budget</div>
                    <button onClick={() => setSettingsModal({ ...project })} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>⚙ Set budget & property</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px' }}>
                    {[
                      { label: 'Budget', val: budget != null ? fm(budget) : '— not set', c: 'var(--text)' },
                      { label: 'Estimated', val: fm(estTotal), c: 'var(--text)' },
                      { label: 'Actual spent', val: fm(actualTotal), c: 'var(--text)' },
                      { label: budget != null && remaining != null && remaining < 0 ? 'Over budget' : 'Remaining', val: remaining != null ? fm(remaining) : '—', c: remaining != null && remaining < 0 ? 'var(--red)' : 'var(--green)' },
                    ].map((m, i) => (
                      <div key={i} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)' }}>{m.label}</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: m.c, marginTop: '4px' }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  {budget != null && budget > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ height: '10px', background: 'var(--bg4)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: Math.min(100, allIn / budget * 100) + '%', background: allIn > budget ? 'var(--red)' : 'var(--green)', transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '5px' }}>{fm(allIn)} of {fm(budget)} committed ({Math.round(allIn / budget * 100)}%) · actual where recorded, otherwise estimate</div>
                    </div>
                  )}
                  {budget == null && (
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '10px' }}>Set a budget cap in ⚙ Settings to track spend against it. Estimates come from each finish’s price × quantity; record actual costs on a finish as you buy.</div>
                  )}
                </div>

                {/* per-room breakdown */}
                {finishes.length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>By room</div>
                    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                      {[...rooms.map(r => ({ id: r.id, name: r.name })), { id: null as any, name: 'Whole-home / Unassigned' }].map(r => {
                        const c = roomCost(r.id)
                        if (c.n === 0) return null
                        return (
                          <div key={r.id || 'whole'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '0.5px solid var(--border)' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{r.name} <span style={{ color: 'var(--text3)', fontSize: '11px' }}>· {c.n} item{c.n === 1 ? '' : 's'}</span></div>
                            <div style={{ fontSize: '12px', color: 'var(--text2)', textAlign: 'right' }}>
                              <span title='Estimated'>{fm(c.est)} est</span>
                              {c.actual > 0 && <span style={{ marginLeft: '10px', color: 'var(--text)' }} title='Actual'>{fm(c.actual)} actual</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* returns */}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>Return on the renovation</div>
                  {!linkedProperty ? (
                    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '4px' }}>Link this project to a property to see ROI.</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px' }}>We’ll pull its current value automatically and compute equity created + return on every reno dollar.</div>
                      <button onClick={() => setSettingsModal({ ...project })} className='btn btn-primary' style={{ fontSize: '12px' }}>⚙ Link a property</button>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '16px 18px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '14px' }}>{linkedProperty.address} · current value {fm(propValue)}{arv == null ? ' · set a projected after-repair value in ⚙ Settings' : ''}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '10px' }}>
                        {[
                          { label: 'All-in reno cost', val: fm(allIn), c: 'var(--text)' },
                          { label: 'Projected ARV', val: arv != null ? fm(arv) : '—', c: 'var(--text)' },
                          { label: 'Value uplift', val: valueUplift != null ? fm(valueUplift) : '—', c: 'var(--text)' },
                          { label: 'Net value created', val: netCreated != null ? fm(netCreated) : '—', c: netCreated != null && netCreated < 0 ? 'var(--red)' : 'var(--green)' },
                          { label: 'Return on reno $', val: roiReno != null ? Math.round(roiReno) + '%' : '—', c: roiReno != null && roiReno < 0 ? 'var(--red)' : 'var(--green)' },
                          { label: 'Added rent', val: rentUpliftMo ? fm(rentUpliftMo) + '/mo' : '—', c: 'var(--text)' },
                          { label: 'Rent yield on reno', val: rentYield != null ? Math.round(rentYield) + '%/yr' : '—', c: 'var(--green)' },
                        ].map((m, i) => (
                          <div key={i} style={{ background: 'var(--bg3)', borderRadius: '9px', padding: '12px 14px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)' }}>{m.label}</div>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: m.c, marginTop: '4px' }}>{m.val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '12px', lineHeight: 1.5 }}>
                        Net value created = projected ARV − current value − all-in reno cost (the forced equity left after paying for the work). Return on reno $ = net value created ÷ reno cost. Rent yield = added annual rent ÷ reno cost.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============ DECISIONS ============ */}
            {tab === 'decisions' && (
              <div style={{ maxWidth: '720px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                  <input style={inp} placeholder='Log a decision or change… e.g. “Client chose matte black hardware over brass”' value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addNote() }} />
                  <button onClick={addNote} className='btn btn-primary' style={{ flexShrink: 0 }}>Log</button>
                </div>
                {activity.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)', fontSize: '13px' }}>No decisions or changes logged yet. Status changes and client approvals show up here automatically.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '2px' }}>
                    {activity.map(a => {
                      const icon = a.kind === 'decision' ? '✅' : a.kind === 'status' ? '🔄' : a.kind === 'approval' ? '👤' : a.kind === 'change' ? '✏️' : '•'
                      return (
                        <div key={a.id} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                          <div style={{ fontSize: '14px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{a.text}</div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '2px' }}>{formatDate(a.created_at)}{a.author && a.author !== 'you' ? ' · ' + a.author : ''}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============ SHARE ============ */}
            {tab === 'share' && (
              <div style={{ maxWidth: '720px', display: 'grid', gap: '18px' }}>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Client share link</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>A read-only board your client opens — no login. They can approve, reject or comment on each finish.</div>
                    </div>
                    <button onClick={toggleShare} className={project?.share_enabled ? 'btn btn-ghost' : 'btn btn-primary'} style={{ flexShrink: 0 }}>{project?.share_enabled ? 'Turn off' : 'Turn on sharing'}</button>
                  </div>
                  {project?.share_enabled && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                      <input readOnly value={shareUrl} onFocus={e => e.target.select()} style={{ ...inp, flex: 1, minWidth: '220px' }} />
                      <button onClick={copyShare} className='btn btn-ghost' style={{ flexShrink: 0 }}>{copied ? '✓ Copied' : 'Copy'}</button>
                      <a href={shareUrl} target='_blank' className='btn btn-ghost' style={{ flexShrink: 0 }}>Preview →</a>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>Client responses {approvals.length > 0 && '(' + approvals.length + ')'}</div>
                  {approvals.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text3)', padding: '20px', textAlign: 'center', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px' }}>No responses yet. Turn on sharing and send the link.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {approvals.map(a => {
                        const it = items.find(i => i.id === a.item_id)
                        return (
                          <div key={a.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '11px 14px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px' }}>
                            <span className={'chip ' + (a.decision === 'approved' ? 'chip-g' : a.decision === 'rejected' ? 'chip-r' : 'chip-b')} style={{ flexShrink: 0 }}>{a.decision === 'approved' ? 'Approved' : a.decision === 'rejected' ? 'Rejected' : 'Comment'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', color: 'var(--text)' }}>{it?.name || 'Item'}</div>
                              {a.comment && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>“{a.comment}”</div>}
                              <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '2px' }}>{a.client_name || 'Client'} · {formatDate(a.created_at)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== finish modal ===== */}
      {finishModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setFinishModal(null)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '520px', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{finishModal.id ? 'Edit Finish' : 'Add Finish'}</div>
            {finishErr && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '12px', padding: '10px 14px', borderRadius: '7px', marginBottom: '12px' }}>{finishErr}</div>}

            {/* paste-a-link importer */}
            <div style={{ background: 'var(--green-bg)', border: '0.5px solid var(--border)', borderRadius: '9px', padding: '12px 14px', marginBottom: '16px' }}>
              <label style={{ ...lbl, color: 'var(--green-dk)' }}>🔗 Paste a product link to auto-fill</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input style={{ ...inp, flex: 1, background: 'var(--bg2)' }} placeholder='https://… (tile, paint, fixture, furniture)' value={importUrl} onChange={e => setImportUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); importFromUrl() } }} />
                <button type='button' onClick={importFromUrl} disabled={importing || !importUrl.trim()} className='btn btn-primary' style={{ flexShrink: 0 }}>{importing ? 'Reading…' : 'Import'}</button>
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '5px' }}>Grabs the photo, name, price &amp; brand. Always double-check before saving.</div>
            </div>

            {/* image */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center' }}>
              <div style={{ width: '76px', height: '76px', borderRadius: '8px', background: finishModal.image_url ? `center/cover no-repeat url(${finishModal.image_url})` : (finishModal.color_hex || 'var(--bg3)'), border: '0.5px solid var(--border2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '22px' }}>{!finishModal.image_url && !finishModal.color_hex && '🧱'}</div>
              <div>
                <input ref={finishFileRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUploadingFor('finish'); const url = await uploadImage(f); setUploadingFor(''); if (url) setFinishModal((m: any) => ({ ...m, image_url: url })); e.currentTarget.value = '' }} />
                <button type='button' onClick={() => finishFileRef.current?.click()} className='btn btn-ghost' style={{ fontSize: '11px' }}>{uploadingFor === 'finish' ? 'Uploading…' : finishModal.image_url ? 'Replace photo' : '⬆ Add photo'}</button>
                {finishModal.image_url && <button type='button' onClick={() => setFinishModal((m: any) => ({ ...m, image_url: '' }))} style={{ marginLeft: '6px', background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '11px', cursor: 'pointer' }}>Remove</button>}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Name *</label>
              <input style={inp} placeholder='e.g. Carrara Hex Mosaic' value={finishModal.name} onChange={e => setFinishModal((m: any) => ({ ...m, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Category</label>
                <select style={inp} value={finishModal.category} onChange={e => setFinishModal((m: any) => ({ ...m, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Room</label>
                <select style={inp} value={finishModal.room_id} onChange={e => setFinishModal((m: any) => ({ ...m, room_id: e.target.value }))}>
                  <option value=''>Whole-home / Unassigned</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Brand / Maker</label>
                <input style={inp} value={finishModal.brand} onChange={e => setFinishModal((m: any) => ({ ...m, brand: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Color</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input style={{ ...inp, flex: 1 }} placeholder='e.g. SW 7008 / #EDEAE0' value={finishModal.color_hex} onChange={e => setFinishModal((m: any) => ({ ...m, color_hex: e.target.value }))} />
                  <label style={{ width: '34px', height: '34px', borderRadius: '7px', border: '0.5px solid var(--border2)', background: /^#[0-9a-fA-F]{6}$/.test(finishModal.color_hex) ? finishModal.color_hex : 'var(--bg3)', flexShrink: 0, cursor: 'pointer', position: 'relative' }}>
                    <input type='color' style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => setFinishModal((m: any) => ({ ...m, color_hex: e.target.value }))} />
                  </label>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Material</label>
                <input style={inp} placeholder='Porcelain, oak, brass…' value={finishModal.material} onChange={e => setFinishModal((m: any) => ({ ...m, material: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Dimensions / Size</label>
                <input style={inp} placeholder='12"×24", 2" hex…' value={finishModal.dimensions} onChange={e => setFinishModal((m: any) => ({ ...m, dimensions: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Unit price</label>
                <input style={inp} type='number' placeholder='per unit' value={finishModal.price} onChange={e => setFinishModal((m: any) => ({ ...m, price: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Qty</label>
                <input style={inp} type='number' placeholder='1' value={finishModal.qty} onChange={e => setFinishModal((m: any) => ({ ...m, qty: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Actual cost</label>
                <input style={inp} type='number' placeholder='when bought' value={finishModal.actual_cost} onChange={e => setFinishModal((m: any) => ({ ...m, actual_cost: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', alignItems: 'end' }}>
              <div>
                <label style={lbl}>Status</label>
                <select style={inp} value={finishModal.status} onChange={e => setFinishModal((m: any) => ({ ...m, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', paddingBottom: '9px' }}>
                Est. line total: <b style={{ color: 'var(--text2)' }}>{fm((Number(finishModal.price) || 0) * (finishModal.qty === '' || finishModal.qty == null ? 1 : Number(finishModal.qty) || 0))}</b>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Supplier</label>
                <input style={inp} placeholder='Where to buy' value={finishModal.supplier} onChange={e => setFinishModal((m: any) => ({ ...m, supplier: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Source link</label>
                <input style={inp} placeholder='https://…' value={finishModal.supplier_url} onChange={e => setFinishModal((m: any) => ({ ...m, supplier_url: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={finishModal.notes} onChange={e => setFinishModal((m: any) => ({ ...m, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setFinishModal(null)} className='btn btn-ghost'>Cancel</button>
              <button onClick={saveFinish} disabled={savingFinish} className='btn btn-primary'>{savingFinish ? 'Saving…' : finishModal.id ? 'Save' : 'Add Finish'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== room modal ===== */}
      {roomModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setRoomModal(null)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{roomModal.id ? 'Edit Room' : 'Add Room'}</div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Room name *</label>
              <input style={inp} placeholder='e.g. Primary Bath, Kitchen, Living Room' value={roomModal.name} onChange={e => setRoomModal((m: any) => ({ ...m, name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>The feel / vibe</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder='Spa-like, warm woods, soft light…' value={roomModal.feel || ''} onChange={e => setRoomModal((m: any) => ({ ...m, feel: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRoomModal(null)} className='btn btn-ghost'>Cancel</button>
              <button onClick={saveRoom} className='btn btn-primary'>{roomModal.id ? 'Save' : 'Add Room'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== settings modal ===== */}
      {settingsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setSettingsModal(null)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '460px', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>Project Settings</div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center' }}>
              <div style={{ width: '70px', height: '52px', borderRadius: '8px', background: (settingsModal._coverPreview || settingsModal.cover_image_url) ? `center/cover no-repeat url(${settingsModal._coverPreview || settingsModal.cover_image_url})` : 'var(--bg3)', border: '0.5px solid var(--border2)', flexShrink: 0 }} />
              <label className='btn btn-ghost' style={{ fontSize: '11px', cursor: 'pointer' }}>
                {settingsModal.cover_image_url || settingsModal._coverFile ? 'Change cover' : '⬆ Cover photo'}
                <input type='file' accept='image/*' style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setSettingsModal((m: any) => ({ ...m, _coverFile: f, _coverPreview: URL.createObjectURL(f) })) }} />
              </label>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Project name</label>
              <input style={inp} value={settingsModal.name || ''} onChange={e => setSettingsModal((m: any) => ({ ...m, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Client name</label>
                <input style={inp} value={settingsModal.client_name || ''} onChange={e => setSettingsModal((m: any) => ({ ...m, client_name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Client email</label>
                <input style={inp} value={settingsModal.client_email || ''} onChange={e => setSettingsModal((m: any) => ({ ...m, client_email: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Address</label>
              <input style={inp} value={settingsModal.address || ''} onChange={e => setSettingsModal((m: any) => ({ ...m, address: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>Overall style / feel</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={settingsModal.style_summary || ''} onChange={e => setSettingsModal((m: any) => ({ ...m, style_summary: e.target.value }))} />
            </div>

            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', marginBottom: '10px' }}>💰 Renovation & ROI</div>
              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Linked property</label>
                <select style={inp} value={settingsModal.property_id || ''} onChange={e => setSettingsModal((m: any) => ({ ...m, property_id: e.target.value }))}>
                  <option value=''>— none —</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
                <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '4px' }}>Pulls the property’s current value to compute ROI.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>Budget cap</label>
                  <input style={inp} type='number' placeholder='$' value={settingsModal.budget_total ?? ''} onChange={e => setSettingsModal((m: any) => ({ ...m, budget_total: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Projected ARV</label>
                  <input style={inp} type='number' placeholder='after-repair $' value={settingsModal.arv ?? ''} onChange={e => setSettingsModal((m: any) => ({ ...m, arv: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Added rent /mo</label>
                  <input style={inp} type='number' placeholder='$/mo' value={settingsModal.rent_uplift ?? ''} onChange={e => setSettingsModal((m: any) => ({ ...m, rent_uplift: e.target.value }))} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={toggleArchive} className='btn btn-ghost' style={{ fontSize: '11px' }}>{project?.status === 'archived' ? 'Restore' : 'Archive'}</button>
                <button onClick={deleteProject} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setSettingsModal(null)} className='btn btn-ghost'>Cancel</button>
                <button onClick={saveSettings} className='btn btn-primary'>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
