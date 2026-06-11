'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase, fm, formatDate } from '@/lib/supabase'

// Per-property registry of appliances, A/C units, water heaters, roofs and major systems —
// brand/model/serial, when bought or replaced, cost, and warranty expiration + receipts.
const CATEGORIES = [
  { v: 'appliance', label: 'Appliance', icon: '🧺' },
  { v: 'hvac', label: 'HVAC / A/C', icon: '❄️' },
  { v: 'water_heater', label: 'Water Heater', icon: '🚿' },
  { v: 'roof', label: 'Roof', icon: '🏠' },
  { v: 'system', label: 'System', icon: '⚙️' },
  { v: 'other', label: 'Other', icon: '📦' },
]
const catOf = (v: string) => CATEGORIES.find(c => c.v === v) || CATEGORIES[CATEGORIES.length - 1]
const blankForm = {
  category: 'appliance', name: '', brand: '', model: '', serial: '', location: '',
  install_date: '', cost: '', warranty_expires: '', notes: '', doc_urls: [] as string[],
}

// warranty status for the chip
function warrantyState(d?: string | null) {
  if (!d) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exp = new Date(d + 'T00:00:00')
  const days = Math.round((exp.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { cls: 'chip-r', text: 'Out of warranty' }
  if (days <= 60) return { cls: 'chip-a', text: 'Expires in ' + days + 'd' }
  return { cls: 'chip-g', text: 'Under warranty' }
}

export default function AssetsManager({ propertyId }: { propertyId: string }) {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<any>(blankForm)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const { data } = await supabase.from('property_assets').select('*').eq('property_id', propertyId).order('category').order('name')
    setAssets(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [propertyId])

  function openAdd() { setEditId(null); setForm(blankForm); setError(''); setShowForm(true) }
  function openEdit(a: any) {
    setEditId(a.id)
    setForm({
      category: a.category || 'appliance', name: a.name || '', brand: a.brand || '', model: a.model || '',
      serial: a.serial || '', location: a.location || '', install_date: a.install_date || '',
      cost: a.cost ?? '', warranty_expires: a.warranty_expires || '', notes: a.notes || '',
      doc_urls: Array.isArray(a.doc_urls) ? a.doc_urls : [],
    })
    setError(''); setShowForm(true)
  }

  async function uploadDoc(ev: any) {
    const file = ev.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = (user?.id || 'unknown') + '/assets/' + propertyId + '/' + Date.now() + '_' + file.name
    const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(path)
    setForm((f: any) => ({ ...f, doc_urls: [...(f.doc_urls || []), urlData.publicUrl] }))
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }
  function removeDoc(url: string) { setForm((f: any) => ({ ...f, doc_urls: (f.doc_urls || []).filter((u: string) => u !== url) })) }
  const docName = (url: string) => { try { return decodeURIComponent(url.split('/').pop()!.split('_').slice(1).join('_')) || 'Document' } catch { return 'Document' } }

  async function save() {
    if (!form.name.trim()) { setError('Name is required (e.g. "Refrigerator", "Central A/C")'); return }
    setSaving(true); setError('')
    const payload: any = {
      property_id: propertyId,
      category: form.category,
      name: form.name.trim(),
      brand: form.brand || null,
      model: form.model || null,
      serial: form.serial || null,
      location: form.location || null,
      install_date: form.install_date || null,
      cost: form.cost !== '' ? parseFloat(form.cost) : null,
      warranty_expires: form.warranty_expires || null,
      notes: form.notes || null,
      doc_urls: form.doc_urls || [],
    }
    const { error: err } = editId
      ? await supabase.from('property_assets').update(payload).eq('id', editId)
      : await supabase.from('property_assets').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowForm(false); load()
  }

  async function del(a: any) {
    if (!confirm('Delete “' + a.name + '”?')) return
    const { error: err } = await supabase.from('property_assets').delete().eq('id', a.id)
    if (err) { alert('Error: ' + err.message); return }
    load()
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>🧰 Appliances &amp; Systems</div>
        <button onClick={openAdd} className='btn btn-primary'>+ Add Item</button>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', maxWidth: '640px' }}>
        Track appliances, A/C units, water heaters, the roof and other major systems — brand, model, serial, when it was bought or replaced, cost, and warranty expiration. Attach the receipt or warranty so it&apos;s never lost.
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '8px' }}>{[0, 1].map(i => <div key={i} className='skeleton' style={{ height: '70px' }} />)}</div>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text3)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧰</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>Nothing logged yet</div>
          <button onClick={openAdd} className='btn btn-primary'>+ Add the first item</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '12px' }}>
          {assets.map(a => {
            const c = catOf(a.category)
            const w = warrantyState(a.warranty_expires)
            return (
              <div key={a.id} style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{c.icon} {a.name}</div>
                  {w && <span className={'chip ' + w.cls}>{w.text}</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>
                  {c.label}
                  {a.brand ? ' · ' + a.brand : ''}
                  {a.model ? ' ' + a.model : ''}
                  {a.location ? ' · ' + a.location : ''}
                </div>
                {a.serial && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>S/N {a.serial}</div>}
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '8px' }}>
                  {a.install_date ? '🛠 Installed ' + formatDate(a.install_date) : ''}
                  {a.cost != null ? (a.install_date ? ' · ' : '') + fm(a.cost) : ''}
                </div>
                {a.warranty_expires && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>Warranty until {formatDate(a.warranty_expires)}</div>}
                {a.notes && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '8px', lineHeight: 1.5 }}>{a.notes}</div>}
                {Array.isArray(a.doc_urls) && a.doc_urls.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {a.doc_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target='_blank' style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '3px 8px' }}>📄 {docName(url)}</a>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  <button onClick={() => openEdit(a)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>Edit</button>
                  <button onClick={() => del(a)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{editId ? 'Edit Item' : 'Add Appliance / System'}</div>
            {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '12px', padding: '10px 14px', borderRadius: '7px', marginBottom: '12px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Category</label>
                <select style={inp} value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Name *</label><input style={inp} placeholder='Refrigerator / Central A/C' value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Brand</label><input style={inp} placeholder='Carrier, GE…' value={form.brand} onChange={e => setForm((f: any) => ({ ...f, brand: e.target.value }))} /></div>
              <div><label style={lbl}>Model</label><input style={inp} value={form.model} onChange={e => setForm((f: any) => ({ ...f, model: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Serial #</label><input style={inp} value={form.serial} onChange={e => setForm((f: any) => ({ ...f, serial: e.target.value }))} /></div>
              <div><label style={lbl}>Location</label><input style={inp} placeholder='Unit 14 kitchen, attic…' value={form.location} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Bought / Replaced</label><input style={inp} type='date' value={form.install_date} onChange={e => setForm((f: any) => ({ ...f, install_date: e.target.value }))} /></div>
              <div><label style={lbl}>Cost</label><input style={inp} type='number' placeholder='0' value={form.cost} onChange={e => setForm((f: any) => ({ ...f, cost: e.target.value }))} /></div>
              <div><label style={lbl}>Warranty Until</label><input style={inp} type='date' value={form.warranty_expires} onChange={e => setForm((f: any) => ({ ...f, warranty_expires: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>Receipt / Warranty</label>
              <input ref={fileRef} type='file' accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' style={{ display: 'none' }} onChange={uploadDoc} />
              <button type='button' className='btn btn-ghost' onClick={() => fileRef.current?.click()} disabled={uploading} style={{ fontSize: '12px' }}>{uploading ? 'Uploading…' : '⬆ Attach file'}</button>
              {(form.doc_urls || []).length > 0 && (
                <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
                  {form.doc_urls.map((url: string, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', borderRadius: '7px', padding: '6px 10px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>📄 {docName(url)}</span>
                      <button onClick={() => removeDoc(url)} style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '17px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className='btn btn-ghost'>Cancel</button>
              <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Saving…' : editId ? 'Save' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
