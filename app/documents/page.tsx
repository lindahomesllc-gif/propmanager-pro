'use client'
import { useEffect, useRef, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, formatDate, signedUrl, openSigned } from '@/lib/supabase'

// Documents Vault — one library for every file, tagged into folders and searchable,
// with drag-&-drop upload and inline preview. Files live in the existing
// `lease-documents` storage bucket; metadata (tag, property, etc.) in `documents`.
const TAGS = ['Insurance', 'Taxes', 'Leases', 'Inspections', 'Repairs', 'Misc']
const tagColor = (t: string) => ({ Insurance: 'var(--amber)', Taxes: 'var(--red)', Leases: 'var(--green)', Inspections: 'var(--blue)', Repairs: '#A78BFA', Misc: 'var(--text2)' }[t] || 'var(--text2)')
const fmtSize = (n: number) => !n ? '' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'

export default function DocumentsVaultPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const [uploadTag, setUploadTag] = useState('Misc')
  const [uploadProp, setUploadProp] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [propFilter, setPropFilter] = useState('all')
  const [q, setQ] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setPreviewUrl(''); if (preview) signedUrl(preview.file_path || preview.file_url).then(setPreviewUrl) }, [preview])

  async function load() {
    const [d, p] = await Promise.all([
      supabase.from('documents').select('*, properties(address), entities(name)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, address').order('address'),
    ])
    setDocs(d.data || []); setProperties(p.data || []); setLoading(false)
  }
  useEffect(() => {
    const qp = new URLSearchParams(window.location.search).get('property')
    if (qp) setPropFilter(qp)
    load()
  }, [])

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (!list.length) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    for (const file of list) {
      const path = (user?.id || 'unknown') + '/vault/' + Date.now() + '_' + file.name
      const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
      if (upErr) { alert('Upload failed: ' + upErr.message); continue }
      const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(path)
      await supabase.from('documents').insert({ name: file.name, tag: uploadTag, property_id: uploadProp || null, file_url: urlData.publicUrl, file_path: path, mime: file.type, size: file.size })
    }
    setUploading(false)
    load()
  }
  async function del(doc: any) {
    if (!confirm('Delete "' + doc.name + '"? This cannot be undone.')) return
    await supabase.from('documents').delete().eq('id', doc.id)
    if (doc.file_path) { try { await supabase.storage.from('lease-documents').remove([doc.file_path]) } catch {} }
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  const ql = q.trim().toLowerCase()
  const filtered = docs.filter(d => {
    if (tagFilter !== 'all' && d.tag !== tagFilter) return false
    if (propFilter !== 'all' && d.property_id !== propFilter) return false
    if (ql && !((d.name || '') + ' ' + (d.properties?.address || '') + ' ' + (d.tag || '')).toLowerCase().includes(ql)) return false
    return true
  })
  const countByTag = (t: string) => docs.filter(d => d.tag === t).length

  const inp: any = { padding: '7px 9px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }
  const isImg = (d: any) => (d.mime || '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(d.name || '')
  const isPdf = (d: any) => (d.mime || '') === 'application/pdf' || /\.pdf$/i.test(d.name || '')

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>📁 Documents Vault</div>
        <button className='btn btn-primary' onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : '⬆ Upload'}</button>
        <input ref={fileRef} type='file' multiple style={{ display: 'none' }} onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          style={{ border: '1.5px dashed ' + (drag ? 'var(--green)' : 'var(--border2)'), background: drag ? 'var(--green-bg)' : 'var(--bg2)', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '10px' }}>⬆ Drag &amp; drop files here, or click to browse — they&apos;ll be filed as:</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
            <select value={uploadTag} onChange={e => setUploadTag(e.target.value)} style={inp}>{TAGS.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <select value={uploadProp} onChange={e => setUploadProp(e.target.value)} style={inp}>
              <option value=''>No property (general)</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </div>
        </div>

        {/* filters */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder='🔎 Search documents…' style={{ ...inp, flex: '1 1 200px', maxWidth: '300px' }} />
          {['all', ...TAGS].map(t => (
            <button key={t} onClick={() => setTagFilter(t)} style={{ padding: '5px 11px', fontSize: '12px', borderRadius: '20px', border: '0.5px solid ' + (tagFilter === t ? (t === 'all' ? 'var(--green)' : tagColor(t)) : 'var(--border2)'), background: tagFilter === t ? (t === 'all' ? 'var(--green-bg)' : tagColor(t) + '22') : 'transparent', color: tagFilter === t ? (t === 'all' ? 'var(--green)' : tagColor(t)) : 'var(--text2)', cursor: 'pointer', fontWeight: tagFilter === t ? 700 : 400 }}>{t === 'all' ? 'All' : t}{t !== 'all' && countByTag(t) > 0 ? ' ' + countByTag(t) : ''}</button>
          ))}
          {properties.length > 0 && (
            <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={{ ...inp, fontSize: '12px' }}>
              <option value='all'>Any property</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          )}
        </div>

        {loading ? <div className='skeleton' style={{ height: '200px' }} /> : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
            <div style={{ fontSize: '14px' }}>{docs.length === 0 ? 'No documents yet — drag files into the box above to get started.' : 'No documents match these filters.'}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '10px' }}>
            {filtered.map(d => (
              <div key={d.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '24px' }}>{isImg(d) ? '🖼' : isPdf(d) ? '📕' : '📄'}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: tagColor(d.tag) + '22', color: tagColor(d.tag), fontWeight: 700, whiteSpace: 'nowrap' }}>{d.tag || 'Misc'}</span>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word' }}>{d.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{d.properties?.address ? d.properties.address + ' · ' : d.entities?.name ? '🏛 ' + d.entities.name + ' · ' : ''}{formatDate(d.created_at)}{d.size ? ' · ' + fmtSize(d.size) : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                  {(isImg(d) || isPdf(d)) && <button onClick={() => setPreview(d)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 10px' }}>👁 Preview</button>}
                  <button onClick={() => openSigned(d.file_path || d.file_url)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 10px' }}>⬇</button>
                  <button onClick={() => del(d)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* preview modal */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', width: '900px', maxWidth: '100%', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{preview.name}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => openSigned(preview.file_path || preview.file_url)} className='btn btn-ghost' style={{ fontSize: '12px' }}>Open in new tab</button>
                <button onClick={() => setPreview(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: '20px', cursor: 'pointer' }}>×</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)' }}>
              {!previewUrl ? <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Loading…</div>
                : isImg(preview)
                ? <img src={previewUrl} alt={preview.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={preview.name} />}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
