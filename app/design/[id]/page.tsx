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

// Curated tap-to-add palette — neutrals, warm woods/brass, sage, coastal blues, terracotta.
const PRESET_COLORS = [
  '#ffffff', '#f5f1ea', '#e8e0d2', '#d8c8b0', '#c2b09a', '#a98e6e', '#8a6d4b', '#5c4630',
  '#1a1a18', '#3a3a36', '#6b6b64', '#9a9a92', '#c9c7be',
  '#e7ece6', '#b9c9be', '#8e9890', '#5e7468', '#2e4034',
  '#dce6e8', '#afc6ca', '#859fa0', '#4f6f75', '#26383c',
  '#f3e6d8', '#e6c9a8', '#c99a5b', '#b5924e', '#8c6a3a',
  '#f0dede', '#d9a9a9', '#b56b6b',
]
// Rotating accent colors (Coastal palette) for room cards.
const ROOM_ACCENTS = ['#0EA5A5', '#38BDF8', '#FB7185', '#F4C77B', '#5DCAA5', '#A78BFA']
// A color per finish category — for the stripe on each finish card.
const CATEGORY_COLORS: Record<string, string> = {
  Tile: '#0EA5A5', Paint: '#FB7185', Flooring: '#B45309', Cabinetry: '#A78BFA', Countertop: '#38BDF8',
  Fixture: '#14B8A6', Lighting: '#F59E0B', Hardware: '#64748B', Appliance: '#6366F1', Plumbing: '#0891B2',
  Textile: '#EC4899', Furniture: '#84CC16', Wallpaper: '#F472B6', Window: '#22D3EE', Other: '#94A3B8',
}
const catColor = (c: string) => CATEGORY_COLORS[c] || '#94A3B8'
// One-click area templates — create a whole suite of rooms at once.
const ROOM_TEMPLATES: { label: string; area: string; rooms: string[] }[] = [
  { label: 'Master Suite', area: 'Master Suite', rooms: ['Bedroom', 'Bath', 'Closet'] },
  { label: 'Guest Suite', area: 'Guest Suite', rooms: ['Bedroom', 'Bath', 'Closet'] },
  { label: 'Kitchen + Pantry', area: 'Kitchen', rooms: ['Kitchen', 'Pantry'] },
  { label: 'Main Living', area: 'Main Living', rooms: ['Living Room', 'Dining Room', 'Entry'] },
  { label: 'Powder + Laundry', area: 'Utility', rooms: ['Powder Room', 'Laundry'] },
  { label: 'Outdoor', area: 'Outdoor', rooms: ['Patio', 'Pool'] },
]
const normalizeHex = (s: string): string | null => {
  let h = (s || '').trim().toLowerCase()
  if (!h) return null
  if (h[0] !== '#') h = '#' + h
  if (/^#[0-9a-f]{6}$/.test(h)) return h
  if (/^#[0-9a-f]{3}$/.test(h)) return '#' + h.slice(1).split('').map(c => c + c).join('')
  return null
}

const emptyFinish = { id: '', room_id: '', category: 'Tile', name: '', brand: '', color_hex: '', material: '', dimensions: '', price: '', qty: '', sqft: '', actual_cost: '', supplier: '', supplier_url: '', image_url: '', images: [] as string[], docs: [] as { name: string; url: string }[], status: 'idea', notes: '' }
// A finish's photos: gallery (image_urls) if present, else the legacy single image_url.
const finishImages = (f: any): string[] => (Array.isArray(f?.image_urls) && f.image_urls.length ? f.image_urls : (f?.image_url ? [f.image_url] : []))

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
  const [importImg, setImportImg] = useState('')
  const [importingImg, setImportingImg] = useState(false)
  const [roomModal, setRoomModal] = useState<any>(null)
  const [detailFinish, setDetailFinish] = useState<any>(null)
  const [lightbox, setLightbox] = useState('')
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(new Set())
  const [photoPicker, setPhotoPicker] = useState<{ mode: 'finish' | 'room'; roomId?: string | null } | null>(null)
  const [settingsModal, setSettingsModal] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [finishFilter, setFinishFilter] = useState('')
  const [copied, setCopied] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [emailSent, setEmailSent] = useState('')
  const [uploadingFor, setUploadingFor] = useState('') // roomId or 'finish' or 'cover'
  const [colorPicker, setColorPicker] = useState<{ roomId: string | null } | null>(null)
  const [suggested, setSuggested] = useState<{ roomId: string | null; colors: string[] } | null>(null)
  const [extracting, setExtracting] = useState('')
  const [hexInput, setHexInput] = useState('')
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

  // While the finish form is open, ⌘V / Ctrl+V pastes a copied image straight in.
  useEffect(() => {
    if (!finishModal) return
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (const it of Array.from(items)) { if (it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) files.push(f) } }
      if (files.length) { e.preventDefault(); await addFinishPhotos(files) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [!!finishModal])

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
    const num = (v: any) => v === '' || v == null ? null : Number(v)
    const area = (roomModal.area || '').trim() || null
    if (roomModal.id) {
      if (!roomModal.name?.trim()) return
      await supabase.from('design_rooms').update({ name: roomModal.name.trim(), feel: roomModal.feel?.trim() || null, sqft: num(roomModal.sqft), area }).eq('id', roomModal.id)
    } else {
      // adding — allow several names at once, comma-separated
      const names = (roomModal.name || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      if (!names.length) return
      const base = rooms.length
      await supabase.from('design_rooms').insert(names.map((name: string, i: number) => ({
        project_id: pid, name, area, sort_order: base + i,
        feel: i === 0 ? (roomModal.feel?.trim() || null) : null,
        sqft: i === 0 ? num(roomModal.sqft) : null,
      })))
    }
    setRoomModal(null); load()
  }
  async function applyTemplate(t: { area: string; rooms: string[] }) {
    const base = rooms.length
    await supabase.from('design_rooms').insert(t.rooms.map((name, i) => ({ project_id: pid, name, area: t.area, sort_order: base + i })))
    setRoomModal(null); load()
  }
  async function deleteRoom(r: any) {
    if (!confirm('Delete room “' + r.name + '”? Items in it will move to Whole-home.')) return
    await supabase.from('design_rooms').delete().eq('id', r.id)
    load()
  }

  // ---------- finishes ----------
  function openFinish(roomId: string | null, existing?: any) {
    setFinishErr(''); setImportUrl(''); setImportImg('')
    if (existing) setFinishModal({ ...emptyFinish, ...existing, price: existing.price ?? '', qty: existing.qty ?? '', sqft: existing.sqft ?? '', actual_cost: existing.actual_cost ?? '', images: finishImages(existing), docs: Array.isArray(existing.docs) ? existing.docs : [], room_id: existing.room_id || '' })
    else setFinishModal({ ...emptyFinish, images: [], room_id: roomId || '' })
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
    const imgs: string[] = Array.isArray(finishModal.images) ? finishModal.images : []
    const payload: any = {
      kind: 'finish', room_id: finishModal.room_id || null, category: finishModal.category || null,
      name: finishModal.name.trim(), brand: finishModal.brand?.trim() || null, color_hex: finishModal.color_hex?.trim() || null,
      material: finishModal.material?.trim() || null, dimensions: finishModal.dimensions?.trim() || null,
      price: numOrNull(finishModal.price), qty: numOrNull(finishModal.qty), sqft: numOrNull(finishModal.sqft), actual_cost: numOrNull(finishModal.actual_cost),
      supplier: finishModal.supplier?.trim() || null, supplier_url: finishModal.supplier_url?.trim() || null,
      image_url: imgs[0] || null, image_urls: imgs, docs: Array.isArray(finishModal.docs) ? finishModal.docs : [],
      status: finishModal.status || 'idea', notes: finishModal.notes?.trim() || null,
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
  async function addFinishPhotos(files: FileList | File[]) {
    const list = Array.from(files); if (!list.length) return
    setUploadingFor('finish')
    const urls: string[] = []
    for (const f of list) { const u = await uploadImage(f); if (u) urls.push(u) }
    setUploadingFor('')
    if (urls.length) setFinishModal((m: any) => m ? ({ ...m, images: [...(m.images || []), ...urls] }) : m)
  }
  async function addFinishDocs(files: FileList | File[]) {
    const list = Array.from(files); if (!list.length) return
    setUploadingFor('docs')
    const added: { name: string; url: string }[] = []
    for (const f of list) { const u = await uploadImage(f); if (u) added.push({ name: f.name, url: u }) }
    setUploadingFor('')
    if (added.length) setFinishModal((m: any) => m ? ({ ...m, docs: [...(m.docs || []), ...added] }) : m)
  }
  // Fetch a pasted image LINK server-side, then upload the bytes to storage.
  async function addImageFromLink() {
    const url = importImg.trim(); if (!url) return
    setImportingImg(true); setFinishErr('')
    try {
      const res = await fetch('/api/design/fetch-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const d = await res.json()
      if (!res.ok || !d.dataUrl) { setFinishErr('Couldn’t fetch that image link. Tip: right-click the image → “Copy Image”, then press ⌘V / Ctrl+V here.'); setImportingImg(false); return }
      const blob = await (await fetch(d.dataUrl)).blob()
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      await addFinishPhotos([new File([blob], 'pasted_' + Date.now() + '.' + ext, { type: blob.type })])
      setImportImg('')
    } catch { setFinishErr('Network error fetching the image.') }
    setImportingImg(false)
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
  // Reuse a photo already uploaded to this project (no re-upload).
  async function reusePhoto(url: string) {
    if (!photoPicker) return
    if (photoPicker.mode === 'finish') {
      setFinishModal((m: any) => !m ? m : ((m.images || []).includes(url) ? m : { ...m, images: [...(m.images || []), url] }))
    } else {
      await supabase.from('design_items').insert({ project_id: pid, room_id: photoPicker.roomId ?? null, kind: 'inspiration', image_url: url, sort_order: items.length })
      load()
    }
  }
  // Turn a moodboard photo into a new finish, reusing the image already stored.
  function useInFinish(roomId: string | null, url: string) {
    setFinishErr(''); setImportUrl('')
    setFinishModal({ ...emptyFinish, images: [url], room_id: roomId || '' })
  }
  async function addInspiration(roomId: string | null, files: FileList | File[]) {
    const list = Array.from(files)
    if (!list.length) return
    setUploadingFor(roomId || 'whole')
    let i = 0
    for (const file of list) {
      const url = await uploadImage(file)
      if (url) await supabase.from('design_items').insert({ project_id: pid, room_id: roomId, kind: 'inspiration', image_url: url, sort_order: items.length + i })
      i++
    }
    setUploadingFor(''); load()
  }
  async function addColor(roomId: string | null, hex: string) {
    const h = normalizeHex(hex) || hex
    await supabase.from('design_items').insert({ project_id: pid, room_id: roomId, kind: 'color', color_hex: h, sort_order: items.length })
    load()
  }
  function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('load')); i.src = src })
  }
  // Sample dominant colors from images (downscaled to a canvas, frequency-bucketed).
  async function extractColors(urls: string[], k = 6): Promise<string[]> {
    const buckets = new Map<string, { c: number; r: number; g: number; b: number }>()
    for (const url of urls) {
      let img: HTMLImageElement
      try { img = await loadImg(url) } catch { continue }
      const w = 80, h = Math.max(1, Math.round(80 * (img.height || 1) / (img.width || 1)))
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h
      const ctx = cv.getContext('2d'); if (!ctx) continue
      ctx.drawImage(img, 0, 0, w, h)
      let data: Uint8ClampedArray
      try { data = ctx.getImageData(0, 0, w, h).data } catch { continue } // tainted (CORS) → skip
      for (let i = 0; i < data.length; i += 12) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        if (a < 200) continue
        if (r > 245 && g > 245 && b > 245) continue // near-white
        if (r < 12 && g < 12 && b < 12) continue    // near-black
        const key = (r >> 5) + '-' + (g >> 5) + '-' + (b >> 5)
        const e = buckets.get(key) || { c: 0, r: 0, g: 0, b: 0 }
        e.c++; e.r += r; e.g += g; e.b += b; buckets.set(key, e)
      }
    }
    const cols = [...buckets.values()].sort((a, b) => b.c - a.c).map(e => ({ r: Math.round(e.r / e.c), g: Math.round(e.g / e.c), b: Math.round(e.b / e.c) }))
    const picked: { r: number; g: number; b: number }[] = []
    for (const c of cols) { if (picked.every(p => Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) > 48)) picked.push(c); if (picked.length >= k) break }
    return picked.map(c => '#' + [c.r, c.g, c.b].map(x => x.toString(16).padStart(2, '0')).join(''))
  }
  async function suggestFromPhotos(roomId: string | null) {
    const urls = items.filter(i => i.kind === 'inspiration' && (i.room_id || null) === (roomId || null) && i.image_url).map(i => i.image_url)
    if (!urls.length) { setSuggested({ roomId, colors: [] }); return }
    setExtracting(roomId || 'whole'); setSuggested(null)
    const cols = await extractColors(urls, 6)
    setExtracting(''); setSuggested({ roomId, colors: cols })
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
  async function emailClient() {
    let to = (project.client_email || '').trim()
    if (!to) { to = (window.prompt('Send the board link to which email?') || '').trim(); if (!to) return }
    setEmailing(true); setEmailSent('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/design/email-link', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
      body: JSON.stringify({ projectId: pid, email: to }),
    })
    const d = await res.json().catch(() => ({}))
    setEmailing(false)
    if (res.ok) { setEmailSent(d.to || to); load() }
    else alert(d.error === 'not_configured' ? 'Email isn’t set up on the server yet (SendGrid keys).' : d.error === 'no_email' ? 'Add a valid client email first (⚙ Settings).' : d.error === 'sharing_off' ? 'Turn sharing on first.' : 'Could not send the email. Please try again.')
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
    const { error } = await supabase.from('design_projects').delete().eq('id', pid)
    if (error) { alert('Could not delete: ' + error.message); return }
    router.push('/design')
  }

  // ---------- derived ----------
  const finishes = items.filter(i => i.kind === 'finish')
  // Every photo already uploaded to this project — for the "reuse a photo" picker.
  const allProjectPhotos: string[] = Array.from(new Set([
    ...items.filter(i => i.kind === 'inspiration' && i.image_url).map(i => i.image_url),
    ...finishes.flatMap(f => finishImages(f)),
    project?.cover_image_url,
  ].filter(Boolean)))
  const latestApprovalByItem: Record<string, any> = {}
  approvals.forEach(a => { if (a.item_id && !latestApprovalByItem[a.item_id]) latestApprovalByItem[a.item_id] = a })
  // Group rooms under Areas (e.g. Master Suite). Build a flat render list that
  // interleaves area headers with their room buckets, honoring collapse state.
  const roomsByArea: Record<string, any[]> = {}
  const areaOrder: string[] = []
  rooms.forEach(r => { const a = (r.area || '').trim(); if (!(a in roomsByArea)) { roomsByArea[a] = []; areaOrder.push(a) } roomsByArea[a].push(r) })
  const existingAreas = areaOrder.filter(Boolean)
  const buckets: any[] = []
  areaOrder.forEach(area => {
    const rs = roomsByArea[area]
    if (area) {
      buckets.push({ type: 'area', area, count: rs.length, sqft: rs.reduce((s, r) => s + (Number(r.sqft) || 0), 0) })
      if (!collapsedAreas.has(area)) rs.forEach(r => buckets.push({ id: r.id, room: r }))
    } else {
      rs.forEach(r => buckets.push({ id: r.id, room: r }))
    }
  })
  buckets.push({ id: null as any, room: null })
  const itemsIn = (roomId: string | null, kind: string) => items.filter(i => i.kind === kind && (i.room_id || null) === (roomId || null))
  // <option>s for room <select>s — grouped under <optgroup> by area.
  const roomOptions = () => areaOrder.map(area => {
    const rs = roomsByArea[area]
    return area
      ? <optgroup key={area} label={area}>{rs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</optgroup>
      : rs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
  })

  // ---------- budget & ROI ----------
  // Cost basis: by area when sq ft is set (tile/flooring), otherwise by quantity.
  const lineBase = (f: any) => { const s = Number(f.sqft) || 0; return s > 0 ? s : (f.qty == null || f.qty === '' ? 1 : Number(f.qty) || 0) }
  const lineEst = (f: any) => (Number(f.price) || 0) * lineBase(f)
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
      background: tab === t ? 'var(--green-bg)' : 'transparent', border: 'none', color: tab === t ? 'var(--green)' : 'var(--text2)',
      borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent', borderRadius: '8px 8px 0 0', fontFamily: 'inherit',
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
      <div className='design-theme' style={{ display: 'contents' }}>
      <div className='design-grad' style={{ height: '5px', flexShrink: 0 }} />
      {/* header */}
      <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'linear-gradient(100deg, rgba(14,165,165,0.16), rgba(56,189,248,0.09) 55%, rgba(251,113,133,0.14))', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <a href='/design' style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Design Studio</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <div className='design-grad-text' style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700 }}>{project?.name || '…'}</div>
              {project?.status === 'archived' && <span className='chip chip-x'>Archived</span>}
              {project?.share_enabled && <span className='chip chip-g'>🔗 Shared</span>}
            </div>
            {project && (project.client_name || project.address) && (
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{[project.client_name, project.address].filter(Boolean).join(' · ')}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <a href={'/design/' + pid + '/print'} target='_blank' className='btn btn-ghost' style={{ fontSize: '11px', padding: '6px 12px' }}>⤓ PDF</a>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'linear-gradient(180deg, rgba(56,189,248,0.07), rgba(251,113,133,0.04) 280px, transparent 560px)' }}>
        {loading ? (
          <div style={{ display: 'grid', gap: '10px' }}>{[0, 1, 2].map(i => <div key={i} className='skeleton' style={{ height: '90px' }} />)}</div>
        ) : (
          <>
            {/* ============ MOODBOARD ============ */}
            {tab === 'moodboard' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Capture the feel of each room — colors, materials, and inspiration photos.</div>
                  <button onClick={() => setRoomModal({ name: '', feel: '', area: '' })} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>+ Add Room</button>
                </div>
                {buckets.map(b => {
                  if (b.type === 'area') {
                    const collapsed = collapsedAreas.has(b.area)
                    return (
                      <div key={'area:' + b.area} onClick={() => setCollapsedAreas(prev => { const n = new Set(prev); n.has(b.area) ? n.delete(b.area) : n.add(b.area); return n })}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 14px', borderRadius: '10px', marginTop: '4px', border: '0.5px solid var(--border)', background: 'linear-gradient(100deg, rgba(14,165,165,0.16), rgba(56,189,248,0.10) 55%, rgba(251,113,133,0.14))' }}>
                        <div className='design-grad-text' style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700 }}>{collapsed ? '▸' : '▾'} {b.area}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text2)' }}>{b.count} room{b.count === 1 ? '' : 's'}{b.sqft ? ' · ' + b.sqft + ' sq ft' : ''}</div>
                      </div>
                    )
                  }
                  const colors = itemsIn(b.id, 'color')
                  const inspo = itemsIn(b.id, 'inspiration')
                  const roomFinishes = finishes.filter(f => (f.room_id || null) === (b.id || null))
                  if (!b.room && colors.length === 0 && inspo.length === 0 && roomFinishes.length === 0) return null
                  return (
                    <div key={b.id || 'whole'} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px', marginLeft: b.room?.area ? '14px' : 0 }}>
                      <div style={{ height: '4px', borderRadius: '12px 12px 0 0', margin: '-16px -18px 14px', background: b.room ? ROOM_ACCENTS[Math.max(0, rooms.findIndex(r => r.id === b.id)) % ROOM_ACCENTS.length] : '#94A3B8' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{b.room ? b.room.name : '🏠 Whole-home'}{b.room?.sqft ? <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)' }}> · {b.room.sqft} sq ft</span> : ''}</div>
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
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {colors.map(c => (
                            <div key={c.id} title={c.color_hex + ' — click to remove'} onClick={() => { if (confirm('Remove this swatch?')) deleteItem(c.id) }} style={{ width: '34px', height: '34px', borderRadius: '8px', background: c.color_hex || '#ccc', border: '1px solid var(--border2)', cursor: 'pointer' }} />
                          ))}
                          <button onClick={() => { setColorPicker(colorPicker?.roomId === b.id ? null : { roomId: b.id }); setSuggested(null); setHexInput('') }} style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px dashed var(--border2)', background: colorPicker?.roomId === b.id ? 'var(--green-bg)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text3)', fontSize: '16px' }} title='Add color'>＋</button>
                          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>palette</span>
                        </div>

                        {colorPicker?.roomId === b.id && (
                          <div style={{ marginTop: '10px', padding: '12px 14px', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: '10px', maxWidth: '420px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '8px' }}>Tap a color to add it</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {PRESET_COLORS.map(hex => (
                                <button key={hex} onClick={() => addColor(b.id, hex)} title={hex} style={{ width: '26px', height: '26px', borderRadius: '6px', background: hex, border: '1px solid var(--border2)', cursor: 'pointer', padding: 0 }} />
                              ))}
                            </div>

                            <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '12px', paddingTop: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <button onClick={() => suggestFromPhotos(b.id)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 10px' }}>{extracting === (b.id || 'whole') ? 'Reading photos…' : '🎨 Pull from photos'}</button>
                                {suggested?.roomId === b.id && suggested.colors.map(hex => (
                                  <button key={hex} onClick={() => addColor(b.id, hex)} title={hex + ' — tap to add'} style={{ width: '26px', height: '26px', borderRadius: '6px', background: hex, border: '2px solid var(--green)', cursor: 'pointer', padding: 0 }} />
                                ))}
                                {suggested?.roomId === b.id && suggested.colors.length === 0 && <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Add some photos to this room first.</span>}
                              </div>
                            </div>

                            <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '12px', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input value={hexInput} onChange={e => setHexInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const h = normalizeHex(hexInput); if (h) { addColor(b.id, h); setHexInput('') } } }} placeholder='#hex' style={{ width: '92px', padding: '6px 9px', fontSize: '12px', border: '0.5px solid var(--border2)', borderRadius: '6px', background: 'var(--bg2)', color: 'var(--text)', outline: 'none' }} />
                              <button onClick={() => { const h = normalizeHex(hexInput); if (h) { addColor(b.id, h); setHexInput('') } }} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 10px' }}>Add</button>
                              <label style={{ width: '30px', height: '30px', borderRadius: '7px', border: '0.5px solid var(--border2)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', position: 'relative' }} title='Custom color'>🎨
                                <input type='color' style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => addColor(b.id, e.target.value)} />
                              </label>
                              <button onClick={() => setColorPicker(null)} className='btn btn-ghost' style={{ marginLeft: 'auto', fontSize: '11px', padding: '5px 10px' }}>Done</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* inspiration */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: '8px', marginTop: '12px' }}>
                        {inspo.map(im => (
                          <div key={im.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', border: '0.5px solid var(--border)' }}>
                            <img src={im.image_url} alt='' onClick={() => setLightbox(im.image_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} />
                            <button onClick={() => { if (confirm('Remove this image?')) deleteItem(im.id) }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '6px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                            <button onClick={() => useInFinish(b.id, im.image_url)} title='Use as a finish' style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '6px', padding: '2px 7px', cursor: 'pointer', fontSize: '9px' }}>→ Finish</button>
                          </div>
                        ))}
                        <label style={{ aspectRatio: '1', borderRadius: '8px', border: '1px dashed var(--border2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text3)', fontSize: '12px', textAlign: 'center', padding: '6px' }}>
                          {uploadingFor === (b.id || 'whole') ? 'Uploading…' : <><div style={{ fontSize: '20px' }}>＋</div>Add photos</>}
                          <input type='file' accept='image/*' multiple style={{ display: 'none' }} onChange={e => { const fs = e.target.files; if (fs && fs.length) addInspiration(b.id, fs); e.currentTarget.value = '' }} />
                        </label>
                        {allProjectPhotos.length > 0 && (
                          <button type='button' onClick={() => setPhotoPicker({ mode: 'room', roomId: b.id })} style={{ aspectRatio: '1', borderRadius: '8px', border: '1px dashed var(--border2)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text3)', fontSize: '11px', textAlign: 'center', padding: '6px' }} title='Reuse a photo already in this project'>
                            <div style={{ fontSize: '18px' }}>📂</div>Reuse
                          </button>
                        )}
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
                    {roomOptions()}
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
                        const imgs = finishImages(f)
                        const cover = imgs[0]
                        return (
                          <div key={f.id} onClick={() => setDetailFinish(f)} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                            <div style={{ height: '4px', background: catColor(f.category) }} />
                            <div style={{ height: '120px', background: 'var(--bg3)', position: 'relative' }}>
                              {cover
                                ? <img src={cover} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: '26px' }}>{f.color_hex ? '' : '🧱'}</div>}
                              {!cover && f.color_hex && <div style={{ position: 'absolute', inset: 0, background: f.color_hex }} />}
                              <span className={'chip ' + sm.chip} style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '9px' }}>{sm.label}</span>
                              {appr && <span className={'chip ' + (appr.decision === 'approved' ? 'chip-g' : appr.decision === 'rejected' ? 'chip-r' : 'chip-b')} style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px' }}>{appr.decision === 'approved' ? '✓ Client' : appr.decision === 'rejected' ? '✗ Client' : '💬 Client'}</span>}
                              {imgs.length > 1 && <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '6px' }}>📷 {imgs.length}</span>}
                              {Array.isArray(f.docs) && f.docs.length > 0 && <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '6px' }}>📄 {f.docs.length}</span>}
                            </div>
                            <div style={{ padding: '11px 13px 13px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>{f.name}</div>
                                {(f.price != null || f.actual_cost != null) && (
                                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)' }}>{fm(lineAllIn(f))}</div>
                                    {f.actual_cost != null && <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--green)' }}>actual</div>}
                                    {f.actual_cost == null && Number(f.sqft) > 0 && <div style={{ fontSize: '9px', color: 'var(--text3)' }}>{f.sqft} SF × {fm(f.price)}</div>}
                                    {f.actual_cost == null && !(Number(f.sqft) > 0) && f.qty != null && Number(f.qty) !== 1 && <div style={{ fontSize: '9px', color: 'var(--text3)' }}>{f.qty}× {fm(f.price)}</div>}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>
                                {[f.category, roomName, f.brand].filter(Boolean).join(' · ')}
                              </div>
                              {(f.material || f.dimensions || Number(f.sqft) > 0) && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{[f.material, f.dimensions, Number(f.sqft) > 0 ? f.sqft + ' SF' : null].filter(Boolean).join(' · ')}</div>}
                              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                    <>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                        <input readOnly value={shareUrl} onFocus={e => e.target.select()} style={{ ...inp, flex: 1, minWidth: '220px' }} />
                        <button onClick={copyShare} className='btn btn-ghost' style={{ flexShrink: 0 }}>{copied ? '✓ Copied' : 'Copy'}</button>
                        <a href={shareUrl} target='_blank' className='btn btn-ghost' style={{ flexShrink: 0 }}>Preview →</a>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={emailClient} disabled={emailing} className='btn btn-primary' style={{ flexShrink: 0 }}>{emailing ? 'Sending…' : '✉️ Email to client'}</button>
                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                          {emailSent ? '✓ Sent to ' + emailSent : project.client_email ? 'Sends to ' + project.client_email : 'No client email saved — you’ll be asked for one.'}
                        </span>
                      </div>
                    </>
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

            {/* photos (gallery — first is the cover) */}
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>Photos {(finishModal.images || []).length > 1 ? '(first = cover · tap a photo to enlarge)' : ''}</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(finishModal.images || []).map((url: string, idx: number) => (
                  <div key={url} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: idx === 0 ? '2px solid var(--green)' : '0.5px solid var(--border2)' }}>
                    <img src={url} alt='' onClick={() => setLightbox(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in', display: 'block' }} />
                    <button type='button' onClick={() => setFinishModal((m: any) => ({ ...m, images: m.images.filter((_: any, i: number) => i !== idx) }))} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '5px', width: '18px', height: '18px', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}>×</button>
                    {idx === 0
                      ? <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: '8px', textAlign: 'center', background: 'var(--green)', color: '#fff', padding: '1px 0' }}>cover</span>
                      : <button type='button' title='Make cover' onClick={() => setFinishModal((m: any) => { const a = [...m.images]; const [x] = a.splice(idx, 1); a.unshift(x); return { ...m, images: a } })} style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '5px', padding: '1px 4px', cursor: 'pointer', fontSize: '9px' }}>★ cover</button>}
                  </div>
                ))}
                <label style={{ width: '70px', height: '70px', borderRadius: '8px', border: '1px dashed var(--border2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text3)', fontSize: '11px', textAlign: 'center' }}>
                  {uploadingFor === 'finish' ? '…' : <><div style={{ fontSize: '18px' }}>＋</div>Add</>}
                  <input type='file' accept='image/*' multiple style={{ display: 'none' }} onChange={e => { const fs = e.target.files; if (fs && fs.length) addFinishPhotos(fs); e.currentTarget.value = '' }} />
                </label>
                {allProjectPhotos.length > 0 && (
                  <button type='button' onClick={() => setPhotoPicker({ mode: 'finish' })} style={{ width: '70px', height: '70px', borderRadius: '8px', border: '1px dashed var(--border2)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text3)', fontSize: '10px', textAlign: 'center' }} title='Reuse a photo already in this project'>
                    <div style={{ fontSize: '16px' }}>📂</div>In&nbsp;app
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input style={{ ...inp, flex: 1 }} placeholder='…or paste an image link' value={importImg} onChange={e => setImportImg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageFromLink() } }} />
                <button type='button' onClick={addImageFromLink} disabled={importingImg || !importImg.trim()} className='btn btn-ghost' style={{ flexShrink: 0 }}>{importingImg ? 'Adding…' : 'Add image'}</button>
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '4px' }}>Or copy an image (right-click → Copy Image) and press ⌘V / Ctrl+V anywhere in this window to paste it straight in.</div>
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
                  {roomOptions()}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '6px' }}>
              <div>
                <label style={lbl}>Unit price</label>
                <input style={inp} type='number' placeholder='per unit/SF' value={finishModal.price} onChange={e => setFinishModal((m: any) => ({ ...m, price: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Qty</label>
                <input style={inp} type='number' placeholder='1' value={finishModal.qty} onChange={e => setFinishModal((m: any) => ({ ...m, qty: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Sq ft</label>
                <input style={inp} type='number' placeholder='area' value={finishModal.sqft} onChange={e => setFinishModal((m: any) => ({ ...m, sqft: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Actual cost</label>
                <input style={inp} type='number' placeholder='paid' value={finishModal.actual_cost} onChange={e => setFinishModal((m: any) => ({ ...m, actual_cost: e.target.value }))} />
              </div>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginBottom: '12px' }}>Enter <b>Sq ft</b> for area-priced items (tile, flooring) — unit price is then per&nbsp;SF. Otherwise use <b>Qty</b> for counted items.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', alignItems: 'end' }}>
              <div>
                <label style={lbl}>Status</label>
                <select style={inp} value={finishModal.status} onChange={e => setFinishModal((m: any) => ({ ...m, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', paddingBottom: '9px' }}>
                Est. line total: <b style={{ color: 'var(--text2)' }}>{fm((Number(finishModal.price) || 0) * lineBase(finishModal))}</b>
                {Number(finishModal.sqft) > 0 ? ' · ' + finishModal.sqft + ' SF' : (Number(finishModal.qty) > 1 ? ' · ' + finishModal.qty + '×' : '')}
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
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>Specs &amp; installation</label>
              {(finishModal.docs || []).length > 0 && (
                <div style={{ display: 'grid', gap: '6px', marginBottom: '8px' }}>
                  {(finishModal.docs || []).map((d: any, i: number) => (
                    <div key={d.url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 11px', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: '7px' }}>
                      <a href={d.url} target='_blank' style={{ fontSize: '12px', color: 'var(--text)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {d.name}</a>
                      <button type='button' onClick={() => setFinishModal((m: any) => ({ ...m, docs: m.docs.filter((_: any, j: number) => j !== i) }))} style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <label className='btn btn-ghost' style={{ fontSize: '11px', cursor: 'pointer', display: 'inline-block' }}>
                {uploadingFor === 'docs' ? 'Uploading…' : '⬆ Add spec / install sheet'}
                <input type='file' accept='.pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.heic' multiple style={{ display: 'none' }} onChange={e => { const fs = e.target.files; if (fs && fs.length) addFinishDocs(fs); e.currentTarget.value = '' }} />
              </label>
              <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '5px' }}>PDF spec sheets, installation guides, warranty docs — for appliances or any finish.</div>
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

      {/* ===== finish detail (read view) ===== */}
      {detailFinish && (() => {
        const f = detailFinish
        const imgs = finishImages(f)
        const sm = statusMeta(f.status)
        const appr = latestApprovalByItem[f.id]
        const roomName = rooms.find(r => r.id === f.room_id)?.name
        const rows: [string, any][] = ([
          ['Category', f.category], ['Room', roomName], ['Brand', f.brand],
          ['Material', f.material], ['Size', f.dimensions],
          Number(f.sqft) > 0 ? ['Sq ft', f.sqft + ' SF'] : null,
          f.qty != null ? ['Qty', f.qty] : null,
          f.price != null ? ['Unit price', fm(f.price)] : null,
          (f.price != null || f.actual_cost != null) ? ['Est. total', fm(lineEst(f))] : null,
          f.actual_cost != null ? ['Actual cost', fm(f.actual_cost)] : null,
          ['Supplier', f.supplier],
        ].filter(r => r && r[1] != null && r[1] !== '') as [string, any][])
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setDetailFinish(null)}>
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '0', width: '560px', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              {/* cover */}
              <div style={{ position: 'relative', background: 'var(--bg3)' }}>
                {imgs[0]
                  ? <img src={imgs[0]} alt='' onClick={() => setLightbox(imgs[0])} style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} />
                  : <div style={{ height: '120px', background: f.color_hex || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: 'var(--text3)' }}>{f.color_hex ? '' : '🧱'}</div>}
                <button onClick={() => setDetailFinish(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '8px', width: '30px', height: '30px', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                <span className={'chip ' + sm.chip} style={{ position: 'absolute', top: '10px', left: '10px' }}>{sm.label}</span>
              </div>
              {/* thumbnails */}
              {imgs.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', padding: '10px 22px 0', flexWrap: 'wrap' }}>
                  {imgs.map((u: string) => <img key={u} src={u} alt='' onClick={() => setLightbox(u)} style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '7px', border: '0.5px solid var(--border2)', cursor: 'zoom-in' }} />)}
                </div>
              )}
              <div style={{ padding: '16px 22px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{f.name}</div>
                  {(f.price != null || f.actual_cost != null) && <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', flexShrink: 0 }}>{fm(lineAllIn(f))}</div>}
                </div>
                {appr && <div style={{ marginTop: '8px' }}><span className={'chip ' + (appr.decision === 'approved' ? 'chip-g' : appr.decision === 'rejected' ? 'chip-r' : 'chip-b')}>{appr.decision === 'approved' ? '✓ Client approved' : appr.decision === 'rejected' ? '✗ Client requested change' : '💬 Client commented'}</span>{appr.comment && <span style={{ fontSize: '12px', color: 'var(--text2)', marginLeft: '8px' }}>“{appr.comment}”</span>}</div>}

                {f.color_hex && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}><div style={{ width: '26px', height: '26px', borderRadius: '6px', background: f.color_hex, border: '1px solid var(--border2)' }} /><span style={{ fontSize: '12px', color: 'var(--text2)' }}>{f.color_hex}</span></div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: '16px' }}>
                  {rows.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderBottom: '0.5px solid var(--border)', paddingBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{k}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text)', textAlign: 'right', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {f.notes && <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '16px', lineHeight: 1.6, background: 'var(--bg3)', borderRadius: '8px', padding: '12px 14px' }}>{f.notes}</div>}

                {Array.isArray(f.docs) && f.docs.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '6px' }}>Specs &amp; installation</div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {f.docs.map((d: any) => <a key={d.url} href={d.url} target='_blank' style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', textDecoration: 'none', padding: '9px 12px', background: 'var(--bg3)', borderRadius: '7px', border: '0.5px solid var(--border)' }}>📄 {d.name}</a>)}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '18px', alignItems: 'center' }}>
                  {f.supplier_url && <a href={f.supplier_url} target='_blank' className='btn btn-ghost' style={{ fontSize: '12px' }}>🔗 Source</a>}
                  <button onClick={() => { openFinish(f.room_id, f); setDetailFinish(null) }} className='btn btn-ghost' style={{ fontSize: '12px' }}>✎ Edit</button>
                  <button onClick={() => setDetailFinish(null)} className='btn btn-primary' style={{ fontSize: '12px', marginLeft: 'auto' }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ===== reuse-a-photo picker ===== */}
      {photoPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: '16px' }} onClick={() => setPhotoPicker(null)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px', width: '560px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>📂 Reuse a photo</div>
              <button onClick={() => setPhotoPicker(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '14px' }}>{photoPicker.mode === 'finish' ? 'Tap to add to this finish — no re-uploading. Added photos are checked.' : 'Tap a photo already in the project to add it to this room.'}</div>
            {allProjectPhotos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)', fontSize: '13px' }}>No photos in this project yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px,1fr))', gap: '8px' }}>
                {allProjectPhotos.map(url => {
                  const inFinish = photoPicker.mode === 'finish' && (finishModal?.images || []).includes(url)
                  return (
                    <div key={url} onClick={() => reusePhoto(url)} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: inFinish ? '2px solid var(--green)' : '0.5px solid var(--border)', cursor: 'pointer' }}>
                      <img src={url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {inFinish && <div style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--green)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div>}
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setPhotoPicker(null)} className='btn btn-primary'>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== lightbox ===== */}
      {lightbox && (
        <div onClick={() => setLightbox('')} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px', cursor: 'zoom-out' }}>
          <img src={lightbox} alt='' style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
          <button onClick={() => setLightbox('')} style={{ position: 'absolute', top: '16px', right: '20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '8px', width: '40px', height: '40px', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ===== room modal ===== */}
      {roomModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setRoomModal(null)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{roomModal.id ? 'Edit Room' : 'Add Rooms'}</div>

            {!roomModal.id && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'var(--green-bg)', border: '0.5px solid var(--border)', borderRadius: '9px' }}>
                <div style={{ ...lbl, color: 'var(--green-dk)' }}>⚡ Quick start — add a whole area</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ROOM_TEMPLATES.map(t => (
                    <button key={t.label} onClick={() => applyTemplate(t)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 10px', background: 'var(--bg2)' }} title={t.area + ': ' + t.rooms.join(', ')}>+ {t.label}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Area / grouping</label>
              <input style={inp} list='area-list' placeholder='e.g. Master Suite (optional — groups rooms)' value={roomModal.area || ''} onChange={e => setRoomModal((m: any) => ({ ...m, area: e.target.value }))} />
              <datalist id='area-list'>{existingAreas.map(a => <option key={a} value={a} />)}</datalist>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Room name{roomModal.id ? ' *' : 's *'}</label>
              <input style={inp} placeholder={roomModal.id ? 'e.g. Primary Bath' : 'e.g. Bedroom, Bath, Closet (commas add several)'} value={roomModal.name} onChange={e => setRoomModal((m: any) => ({ ...m, name: e.target.value }))} />
              {!roomModal.id && <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '4px' }}>Separate with commas to add several rooms at once.</div>}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>The feel / vibe</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder='Spa-like, warm woods, soft light…' value={roomModal.feel || ''} onChange={e => setRoomModal((m: any) => ({ ...m, feel: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>Room size (sq ft)</label>
              <input style={inp} type='number' placeholder='e.g. 120' value={roomModal.sqft ?? ''} onChange={e => setRoomModal((m: any) => ({ ...m, sqft: e.target.value }))} />
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
      </div>
    </AppShell>
  )
}
