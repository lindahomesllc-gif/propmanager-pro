'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase, openSigned } from '@/lib/supabase'

// Per-property paint & materials log: never guess a touch-up color again.
// Records where each color/material is used, brand, name, code, sheen, an optional
// swatch, notes and photos. Backed by public.property_paints.
const AREAS = ['Front Door', 'Exterior Body', 'Exterior Trim', 'Garage Door', 'Shutters', 'Soffit/Fascia', 'Living Room', 'Kitchen', 'Primary Bedroom', 'Bedrooms', 'Bathrooms', 'Hallway', 'Ceilings', 'Trim / Baseboards', 'Cabinets', 'Flooring', 'Tile', 'Countertop']
const BRANDS = ['Sherwin-Williams', 'Benjamin Moore', 'Behr', 'Valspar', 'PPG', 'Glidden', 'Dunn-Edwards', 'Kilz']
const SHEENS = ['Flat / Matte', 'Eggshell', 'Satin', 'Semi-Gloss', 'Gloss']
const blankForm = { area: '', brand: '', color_name: '', color_code: '', sheen: '', hex: '', notes: '', photo_urls: [] as string[] }

export default function PaintManager({ propertyId }: { propertyId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<any>(blankForm)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const { data } = await supabase.from('property_paints').select('*').eq('property_id', propertyId).order('area')
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [propertyId])

  function openAdd() { setEditId(null); setForm(blankForm); setError(''); setShowForm(true) }
  function openEdit(it: any) {
    setEditId(it.id)
    setForm({
      area: it.area || '', brand: it.brand || '', color_name: it.color_name || '', color_code: it.color_code || '',
      sheen: it.sheen || '', hex: it.hex || '', notes: it.notes || '', photo_urls: Array.isArray(it.photo_urls) ? it.photo_urls : [],
    })
    setError(''); setShowForm(true)
  }

  async function uploadPhoto(ev: any) {
    const file = ev.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = (user?.id || 'unknown') + '/paint/' + propertyId + '/' + Date.now() + '_' + file.name
    const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(path)
    setForm((f: any) => ({ ...f, photo_urls: [...(f.photo_urls || []), urlData.publicUrl] }))
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }
  function removePhoto(url: string) { setForm((f: any) => ({ ...f, photo_urls: (f.photo_urls || []).filter((u: string) => u !== url) })) }

  async function save() {
    if (!form.area.trim()) { setError('Where is it? (e.g. Front Door, Living Room)'); return }
    if (!form.color_name.trim() && !form.color_code.trim()) { setError('Add at least a color name or code'); return }
    setSaving(true); setError('')
    const payload: any = {
      property_id: propertyId,
      area: form.area.trim(),
      brand: form.brand || null,
      color_name: form.color_name || null,
      color_code: form.color_code || null,
      sheen: form.sheen || null,
      hex: form.hex || null,
      notes: form.notes || null,
      photo_urls: form.photo_urls || [],
    }
    const { error: err } = editId
      ? await supabase.from('property_paints').update(payload).eq('id', editId)
      : await supabase.from('property_paints').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowForm(false); load()
  }

  async function del(it: any) {
    if (!confirm('Delete the paint record for “' + it.area + '”?')) return
    const { error: err } = await supabase.from('property_paints').delete().eq('id', it.id)
    if (err) { alert('Error: ' + err.message); return }
    load()
  }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>🎨 Paint &amp; Materials</div>
        <button onClick={openAdd} className='btn btn-primary'>+ Add Color</button>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', maxWidth: '640px' }}>
        Record every paint color and material — door, exterior, trim, each room, flooring, tile — with brand, color name, code and sheen. Snap the can label so a touch-up or repaint is never guesswork.
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '8px' }}>{[0, 1].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text3)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>No colors logged yet</div>
          <button onClick={openAdd} className='btn btn-primary'>+ Add the first color</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: '12px' }}>
          {items.map(it => (
            <div key={it.id} style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '7px', flexShrink: 0, border: '0.5px solid var(--border2)', background: it.hex || 'var(--bg4)' }} title={it.hex || ''} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{it.area}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{[it.color_name, it.color_code].filter(Boolean).join(' · ') || '—'}</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>
                {[it.brand, it.sheen].filter(Boolean).join(' · ')}
              </div>
              {it.notes && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '6px', lineHeight: 1.5 }}>{it.notes}</div>}
              {Array.isArray(it.photo_urls) && it.photo_urls.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {it.photo_urls.map((url: string, i: number) => (
                    <button key={i} onClick={() => openSigned(url)} style={{ fontSize: '11px', color: 'var(--green)', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>📷 Photo {i + 1}</button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                <button onClick={() => openEdit(it)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>Edit</button>
                <button onClick={() => del(it)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '460px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{editId ? 'Edit Color' : 'Add Paint / Material'}</div>
            {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '12px', padding: '10px 14px', borderRadius: '7px', marginBottom: '12px' }}>{error}</div>}
            <datalist id='paint-areas'>{AREAS.map(a => <option key={a} value={a} />)}</datalist>
            <datalist id='paint-brands'>{BRANDS.map(b => <option key={b} value={b} />)}</datalist>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Where is it? *</label>
              <input style={inp} list='paint-areas' placeholder='Front Door, Living Room, Trim…' value={form.area} onChange={e => setForm((f: any) => ({ ...f, area: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Color Name</label><input style={inp} placeholder='Tricorn Black' value={form.color_name} onChange={e => setForm((f: any) => ({ ...f, color_name: e.target.value }))} /></div>
              <div><label style={lbl}>Color Code</label><input style={inp} placeholder='SW 6258' value={form.color_code} onChange={e => setForm((f: any) => ({ ...f, color_code: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Brand</label><input style={inp} list='paint-brands' placeholder='Sherwin-Williams' value={form.brand} onChange={e => setForm((f: any) => ({ ...f, brand: e.target.value }))} /></div>
              <div><label style={lbl}>Sheen / Finish</label>
                <select style={inp} value={form.sheen} onChange={e => setForm((f: any) => ({ ...f, sheen: e.target.value }))}>
                  <option value=''>—</option>
                  {SHEENS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Swatch color (optional)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type='color' value={form.hex || '#cccccc'} onChange={e => setForm((f: any) => ({ ...f, hex: e.target.value }))} style={{ width: '46px', height: '36px', padding: 0, border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', cursor: 'pointer' }} />
                <input style={{ ...inp, flex: 1 }} placeholder='#1A1A1A — for a visual swatch' value={form.hex} onChange={e => setForm((f: any) => ({ ...f, hex: e.target.value }))} />
                {form.hex && <button type='button' onClick={() => setForm((f: any) => ({ ...f, hex: '' }))} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '12px' }}>clear</button>}
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder='2 coats, bought at Home Depot, 1 gal left in garage…' value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>Photo (can label / wall)</label>
              <input ref={fileRef} type='file' accept='image/*,.pdf' style={{ display: 'none' }} onChange={uploadPhoto} />
              <button type='button' className='btn btn-ghost' onClick={() => fileRef.current?.click()} disabled={uploading} style={{ fontSize: '12px' }}>{uploading ? 'Uploading…' : '📷 Attach photo'}</button>
              {(form.photo_urls || []).length > 0 && (
                <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
                  {form.photo_urls.map((url: string, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', borderRadius: '7px', padding: '6px 10px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text2)' }}>📷 Photo {i + 1}</span>
                      <button onClick={() => removePhoto(url)} style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '17px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className='btn btn-ghost'>Cancel</button>
              <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Saving…' : editId ? 'Save' : 'Add Color'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
