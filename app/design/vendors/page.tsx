'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

const CREAM = '#F6F1E8', INK = '#3D362E', INK2 = '#7C7264', FAINT = '#A99E8E', LINE = 'rgba(61,54,46,0.12)', LINE2 = 'rgba(61,54,46,0.24)', ACCENT = '#A78A5E'
const SERIF = "'Cormorant Garamond', serif"
const empty = { id: '', name: '', category: '', contact: '', email: '', phone: '', website: '', account_no: '', notes: '' }

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  async function load() {
    const { data } = await supabase.from('design_vendors').select('*').order('name')
    setVendors(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const payload = { name: form.name.trim(), category: form.category.trim() || null, contact: form.contact.trim() || null, email: form.email.trim() || null, phone: form.phone.trim() || null, website: form.website.trim() || null, account_no: form.account_no.trim() || null, notes: form.notes.trim() || null }
    const { error: err } = form.id ? await supabase.from('design_vendors').update(payload).eq('id', form.id) : await supabase.from('design_vendors').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm(null); load()
  }
  async function del(v: any) {
    if (!confirm('Delete vendor “' + v.name + '”?')) return
    await supabase.from('design_vendors').delete().eq('id', v.id); load()
  }

  const visible = vendors.filter(v => !q || (v.name + ' ' + (v.category || '') + ' ' + (v.contact || '')).toLowerCase().includes(q.toLowerCase()))
  const eyebrow: any = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: FAINT }
  const cta: any = { fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff', background: ACCENT, border: 'none', borderRadius: '3px', padding: '12px 22px', cursor: 'pointer' }
  const inp: any = { width: '100%', padding: '10px 13px', fontSize: '13px', border: '1px solid ' + LINE2, borderRadius: '4px', background: '#fff', color: INK, outline: 'none', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }
  const lbl: any = { display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: FAINT, marginBottom: '5px' }

  return (
    <AppShell>
      <div style={{ flex: 1, overflowY: 'auto', background: CREAM, color: INK }}>
        <div style={{ padding: '40px 44px 28px', borderBottom: '1px solid ' + LINE, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <a href='/design' style={{ ...eyebrow, textDecoration: 'none', color: FAINT }}>← Design Studio</a>
            <div style={{ fontFamily: SERIF, fontSize: '40px', fontWeight: 600, lineHeight: 1, marginTop: '10px' }}>Vendors &amp; trades</div>
            <div style={{ fontSize: '13px', color: INK2, marginTop: '8px', maxWidth: '460px' }}>Your sources — showrooms, suppliers, and trades you reuse across every project.</div>
          </div>
          <button onClick={() => { setForm({ ...empty }); setError('') }} style={cta}>+ Add Vendor</button>
        </div>

        <div style={{ padding: '24px 44px 64px' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder='Search vendors…' style={{ ...inp, maxWidth: '320px', marginBottom: '20px' }} />
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '14px' }}>{[0, 1, 2].map(i => <div key={i} className='skeleton' style={{ height: '140px', borderRadius: '10px' }} />)}</div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: FAINT }}>
              <div style={{ fontFamily: SERIF, fontSize: '26px', fontStyle: 'italic', color: INK2 }}>{vendors.length === 0 ? 'No vendors yet' : 'No matches'}</div>
              {vendors.length === 0 && <button onClick={() => setForm({ ...empty })} style={{ ...cta, marginTop: '18px' }}>+ Add your first vendor</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: '14px' }}>
              {visible.map(v => (
                <div key={v.id} style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ fontFamily: SERIF, fontSize: '21px', fontWeight: 600, color: INK, lineHeight: 1.1 }}>{v.name}</div>
                    {v.category && <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(167,138,94,0.14)', color: ACCENT, padding: '3px 8px', borderRadius: '4px', flexShrink: 0 }}>{v.category}</span>}
                  </div>
                  <div style={{ fontSize: '12.5px', color: INK2, marginTop: '8px', lineHeight: 1.7 }}>
                    {v.contact && <div>{v.contact}</div>}
                    {v.phone && <div>{v.phone}</div>}
                    {v.email && <div><a href={'mailto:' + v.email} style={{ color: ACCENT, textDecoration: 'none' }}>{v.email}</a></div>}
                    {v.website && <div><a href={v.website.startsWith('http') ? v.website : 'https://' + v.website} target='_blank' style={{ color: ACCENT, textDecoration: 'none' }}>{v.website} ↗</a></div>}
                    {v.account_no && <div style={{ color: FAINT }}>Acct: {v.account_no}</div>}
                  </div>
                  {v.notes && <div style={{ fontSize: '12px', color: INK2, marginTop: '8px', lineHeight: 1.5 }}>{v.notes}</div>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => { setForm({ ...empty, ...v }); setError('') }} style={{ background: 'transparent', border: '1px solid ' + LINE2, borderRadius: '4px', padding: '5px 12px', fontSize: '11px', color: INK2, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => del(v)} style={{ background: 'transparent', border: 'none', color: FAINT, fontSize: '11px', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(40,35,28,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setForm(null)}>
          <div style={{ background: '#FBF8F2', border: '1px solid ' + LINE, borderRadius: '12px', padding: '26px', width: '460px', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: SERIF, fontSize: '24px', fontWeight: 600, color: INK, marginBottom: '16px' }}>{form.id ? 'Edit vendor' : 'New vendor'}</div>
            {error && <div style={{ background: 'rgba(180,83,75,0.1)', color: '#9C463F', fontSize: '12px', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Name *</label><input style={inp} value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
              <div><label style={lbl}>Category</label><input style={inp} placeholder='Tile, Lighting, Trade…' value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Contact person</label><input style={inp} value={form.contact} onChange={e => setForm((f: any) => ({ ...f, contact: e.target.value }))} /></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
              <div><label style={lbl}>Website</label><input style={inp} value={form.website} onChange={e => setForm((f: any) => ({ ...f, website: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: '12px' }}><label style={lbl}>Account / trade #</label><input style={inp} value={form.account_no} onChange={e => setForm((f: any) => ({ ...f, account_no: e.target.value }))} /></div>
            <div style={{ marginBottom: '20px' }}><label style={lbl}>Notes</label><textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button onClick={() => setForm(null)} style={{ background: 'transparent', border: 'none', color: INK2, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ ...cta, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save vendor'}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
