'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

const TYPES = [
  { v: 'llc', label: 'LLC' },
  { v: 's_corp', label: 'S-Corp' },
  { v: 'partnership', label: 'Partnership' },
  { v: 'trust', label: 'Trust' },
  { v: 'solo_401k', label: 'Solo 401(k)' },
  { v: 'individual', label: 'Individual' },
]
const typeLabel = (t) => (TYPES.find(x => x.v === t)?.label || t || 'LLC')

export default function EntitiesPage() {
  const [entities, setEntities] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', type: 'llc', ein: '', notes: '' })
  const [docEntity, setDocEntity] = useState(null)
  const [docUploading, setDocUploading] = useState(false)
  const fileRef = useRef(null)

  async function load() {
    const [{ data: ents }, { data: props }] = await Promise.all([
      supabase.from('entities').select('*').order('name'),
      supabase.from('properties').select('entity_id'),
    ])
    setEntities(ents || [])
    const c = {}
    ;(props || []).forEach(p => { if (p.entity_id) c[p.entity_id] = (c[p.entity_id] || 0) + 1 })
    setCounts(c)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() { setEditId(null); setForm({ name: '', type: 'llc', ein: '', notes: '' }); setError(''); setShowForm(true) }
  function openEdit(e) { setEditId(e.id); setForm({ name: e.name || '', type: e.type || 'llc', ein: e.ein || '', notes: e.notes || '' }); setError(''); setShowForm(true) }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const payload = { name: form.name.trim(), type: form.type, ein: form.ein || null, notes: form.notes || null }
    const { error: err } = editId
      ? await supabase.from('entities').update(payload).eq('id', editId)
      : await supabase.from('entities').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowForm(false); load()
  }

  async function del(e) {
    if ((counts[e.id] || 0) > 0) { alert('“' + e.name + '” has ' + counts[e.id] + ' propert' + (counts[e.id] === 1 ? 'y' : 'ies') + ' assigned. Reassign them first.'); return }
    if (!confirm('Delete entity “' + e.name + '”?')) return
    const { error: err } = await supabase.from('entities').delete().eq('id', e.id)
    if (err) { alert('Error: ' + err.message); return }
    load()
  }

  async function uploadDoc(ev) {
    const file = ev.target.files?.[0]
    if (!file || !docEntity) return
    setDocUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = (user?.id || 'unknown') + '/entities/' + docEntity.id + '/' + Date.now() + '_' + file.name
    const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); setDocUploading(false); return }
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(path)
    const next = [...(docEntity.doc_urls || []), urlData.publicUrl]
    const { error: updErr } = await supabase.from('entities').update({ doc_urls: next }).eq('id', docEntity.id)
    if (updErr) { alert('Error: ' + updErr.message); setDocUploading(false); return }
    setDocEntity(d => ({ ...d, doc_urls: next }))
    setEntities(list => list.map(x => x.id === docEntity.id ? { ...x, doc_urls: next } : x))
    setDocUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function removeDoc(url) {
    if (!docEntity || !confirm('Remove this document?')) return
    const next = (docEntity.doc_urls || []).filter(u => u !== url)
    const { error: updErr } = await supabase.from('entities').update({ doc_urls: next }).eq('id', docEntity.id)
    if (updErr) { alert('Error: ' + updErr.message); return }
    setDocEntity(d => ({ ...d, doc_urls: next }))
    setEntities(list => list.map(x => x.id === docEntity.id ? { ...x, doc_urls: next } : x))
  }

  const docName = (url) => { try { return decodeURIComponent(url.split('/').pop().split('_').slice(1).join('_')) || 'Document' } catch { return 'Document' } }

  const inp = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '4px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Entities</div>
        <button onClick={openAdd} className='btn btn-primary'>+ Add Entity</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', maxWidth: '640px' }}>
          Group your properties by the legal entity that owns them — each LLC, trust, partnership, or Solo 401(k). You can then filter and report per entity (e.g. separate Schedule E per LLC).
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>
        ) : entities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏛️</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '14px' }}>No entities yet</div>
            <button onClick={openAdd} className='btn btn-primary'>+ Add your first entity</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '12px' }}>
            {entities.map(e => (
              <div key={e.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{e.name}</div>
                  <span className='chip chip-b'>{typeLabel(e.type)}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                  {counts[e.id] || 0} propert{counts[e.id] === 1 ? 'y' : 'ies'}{e.ein ? ' · EIN ' + e.ein : ''}
                </div>
                {e.notes && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '8px', lineHeight: 1.5 }}>{e.notes}</div>}
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  <button onClick={() => openEdit(e)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>Edit</button>
                  <button onClick={() => setDocEntity(e)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 12px' }}>📄 Docs{(e.doc_urls || []).length ? ' (' + e.doc_urls.length + ')' : ''}</button>
                  <button onClick={() => del(e)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '420px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{editId ? 'Edit Entity' : 'Add Entity'}</div>
            {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '12px', padding: '10px 14px', borderRadius: '7px', marginBottom: '12px' }}>{error}</div>}
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Name *</label>
              <input style={inp} placeholder='e.g. LM LLC, Smith Family Trust' value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Type</label>
                <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>EIN (optional)</label>
                <input style={inp} placeholder='12-3456789' value={form.ein} onChange={e => setForm(f => ({ ...f, ein: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className='btn btn-ghost'>Cancel</button>
              <button onClick={save} disabled={saving} className='btn btn-primary'>{saving ? 'Saving…' : editId ? 'Save' : 'Add Entity'}</button>
            </div>
          </div>
        </div>
      )}

      {docEntity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDocEntity(null)}>
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', width: '480px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{docEntity.name} — Documents</div>
              <button onClick={() => setDocEntity(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>Operating agreement, IRS EIN/TIN letter, formation docs, etc.</div>
            <input ref={fileRef} type='file' accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' style={{ display: 'none' }} onChange={uploadDoc} />
            <button className='btn btn-primary' onClick={() => fileRef.current?.click()} disabled={docUploading} style={{ marginBottom: '14px' }}>{docUploading ? 'Uploading…' : '⬆ Upload Document'}</button>
            {(!docEntity.doc_urls || docEntity.doc_urls.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
                <div style={{ fontSize: '13px' }}>No documents yet.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {docEntity.doc_urls.map((url, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '0.5px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>📄 {docName(url)}</div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <a href={url} target='_blank' className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 10px' }}>View</a>
                      <button onClick={() => removeDoc(url)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
