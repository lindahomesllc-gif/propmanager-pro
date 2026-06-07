'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, formatDate } from '@/lib/supabase'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [propFilter, setPropFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [sendingId, setSendingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('tenants').select('*, properties(address)').order('full_name'),
      supabase.from('leases').select('tenant_id, rent_amount, end_date, status').eq('status', 'executed'),
      supabase.from('payments').select('tenant_id, status, due_date'),
    ]).then(([t, l, p]) => {
      setTenants(t.data || []); setLeases(l.data || []); setPayments(p.data || [])
      setLoading(false)
    })
  }, [])

  async function deleteTenant(id: string, name: string) {
    // Check for attached history first — never silently destroy financial records.
    const [{ count: payCount }, { count: leaseCount }] = await Promise.all([
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('leases').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    ])
    const pc = payCount || 0, lc = leaseCount || 0
    if (pc > 0 || lc > 0) {
      const ok = confirm(
        name + ' has ' + pc + ' payment' + (pc === 1 ? '' : 's') + ' and ' + lc + ' lease' + (lc === 1 ? '' : 's') + ' on record.\n\n' +
        'Deleting would orphan that history. The safe option is to mark them as Past (keeps all records).\n\n' +
        'OK = mark as Past (recommended)\nCancel = do nothing'
      )
      if (!ok) return
      const { error } = await supabase.from('tenants').update({ status: 'past', move_out_date: new Date().toISOString().split('T')[0] }).eq('id', id)
      if (error) { alert('Error: ' + error.message); return }
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: 'past' } : t))
      return
    }
    if (!confirm('Delete ' + name + '? This cannot be undone.')) return
    const { error } = await supabase.from('tenants').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    setTenants(prev => prev.filter(t => t.id !== id))
  }

  async function sendPortalLink(tenant: any) {
    if (!tenant.email) { alert('This tenant has no email address on file. Add one before sending a portal link.'); return }
    if (!confirm('Send a portal login link to ' + tenant.full_name + ' (' + tenant.email + ')?\n\nThey will get an email to access the tenant portal.')) return
    setSendingId(tenant.id)
    const { error } = await supabase.auth.signInWithOtp({
      email: tenant.email,
      options: { emailRedirectTo: window.location.origin + '/portal/auth/callback' },
    })
    if (!error && !tenant.portal_access) {
      await supabase.from('tenants').update({ portal_access: true }).eq('id', tenant.id)
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, portal_access: true } : t))
    }
    setSendingId(null)
    if (error) {
      const msg = /rate limit/i.test(error.message)
        ? 'A login link was sent to this tenant recently. Please wait a few minutes before requesting another.'
        : 'Could not send portal link: ' + error.message
      alert(msg); return
    }
    alert('✅ Portal login link sent to ' + tenant.email + '\n\nThe link expires in 1 hour.')
  }

  const today = new Date().toISOString().split('T')[0]
  // active lease (rent + end date) per tenant
  const leaseOf: Record<string, any> = {}
  leases.forEach(l => { if (l.tenant_id && !leaseOf[l.tenant_id]) leaseOf[l.tenant_id] = l })
  // does the tenant currently owe? (late / partial / past-due)
  const owes: Record<string, boolean> = {}
  payments.forEach(p => {
    const overdue = p.status === 'late' || p.status === 'partial' || (p.status === 'due' && p.due_date && p.due_date <= today)
    if (overdue && p.tenant_id) owes[p.tenant_id] = true
  })
  // payment standing badge: only meaningful for active tenants
  const standing = (t: any) => t.status !== 'active' ? null : (owes[t.id] ? { label: 'Late', cls: 'chip-r' } : { label: 'Current', cls: 'chip-g' })

  const active = tenants.filter(t => t.status === 'active')
  const past = tenants.filter(t => t.status === 'past')

  // properties present, for the filter dropdown
  const propOptions = Array.from(new Map(tenants.filter(t => t.property_id).map(t => [t.property_id, t.properties?.address || t.property_id])).entries())

  const filtered = tenants.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter
    const matchProp = propFilter === 'all' || t.property_id === propFilter
    const matchSearch = !search || t.full_name?.toLowerCase().includes(search.toLowerCase()) || t.co_tenant_name?.toLowerCase().includes(search.toLowerCase()) || t.unit_address?.toLowerCase().includes(search.toLowerCase()) || t.properties?.address?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchProp && matchSearch
  })

  const statusColor = (s: string) => ({ active: 'var(--green)', past: 'var(--text3)', applicant: 'var(--amber)' }[s] || 'var(--text3)')
  const statusBg = (s: string) => ({ active: 'var(--green-bg)', past: 'var(--bg3)', applicant: 'var(--amber-bg)' }[s] || 'var(--bg3)')
  const chipClass = (s: string) => ({ active: 'chip-g', past: 'chip-x', applicant: 'chip-a' }[s] || 'chip-x')
  const sel = { padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }

  // small action buttons reused in both views
  const actions = (t: any) => (
    <>
      <button onClick={e => { e.preventDefault(); sendPortalLink(t) }} disabled={sendingId === t.id} title='Send portal login link' style={{ background: 'transparent', color: 'var(--green)', border: '0.5px solid var(--border2)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: sendingId === t.id ? 'not-allowed' : 'pointer', opacity: sendingId === t.id ? 0.6 : 1, whiteSpace: 'nowrap' }}>{sendingId === t.id ? '…' : '✉ Portal'}</button>
      <button onClick={e => { e.preventDefault(); deleteTenant(t.id, t.full_name) }} style={{ background: 'transparent', color: 'var(--text3)', border: '0.5px solid var(--border2)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
    </>
  )

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Tenants</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setView(v => v === 'cards' ? 'list' : 'cards')} className='btn btn-ghost'>{view === 'cards' ? '☰ List' : '⊞ Cards'}</button>
          <a href='/tenants/new' className='btn btn-primary'>+ Add Tenant</a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '✅ Active', value: active.length, color: 'var(--green)', f: 'active' },
          { label: '👥 Total', value: tenants.length, color: 'var(--text)', f: 'all' },
          { label: '📦 Past', value: past.length, color: 'var(--text3)', f: 'past' },
        ].map((mc, i) => (
          <button key={mc.label} onClick={() => setFilter(filter === mc.f ? 'all' : mc.f)} style={{ padding: '14px 20px', background: filter === mc.f ? mc.color + '15' : 'var(--bg2)', border: 'none', borderRight: i < 2 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0, display: 'flex', gap: '8px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='🔍 Search by name, address...' className='input' style={{ flex: 1 }} />
        {propOptions.length > 1 && (
          <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={sel}>
            <option value='all'>All Properties</option>
            {propOptions.map(([id, addr]) => <option key={id} value={id}>{addr}</option>)}
          </select>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text2)', marginBottom: '16px' }}>{search ? 'No results found' : 'No tenants yet'}</div>
            {!search && <a href='/tenants/new' className='btn btn-primary'>+ Add Tenant</a>}
          </div>
        )}

        {/* LIST VIEW */}
        {!loading && filtered.length > 0 && view === 'list' && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filtered.map(t => {
              const l = leaseOf[t.id]; const st = standing(t)
              return (
                <a key={t.id} href={'/tenants/' + t.id} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + statusColor(t.status), borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: statusBg(t.status), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: statusColor(t.status), flexShrink: 0, border: '1.5px solid ' + statusColor(t.status) }}>
                      {t.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{t.full_name}{t.co_tenant_name ? ' & ' + t.co_tenant_name : ''}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)' }}>📍 {t.unit_address || t.properties?.address || 'No property'}</div>
                      {t.email && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{t.email}{t.phone ? ' · ' + t.phone : ''}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0, minWidth: '92px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: l ? 'var(--green)' : 'var(--text3)' }}>{l ? fm(l.rent_amount) + '/mo' : '—'}</div>
                      {l?.end_date && <div style={{ fontSize: '10px', color: 'var(--text3)' }}>ends {formatDate(l.end_date)}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {st ? <span className={'chip ' + st.cls}>{st.label}</span> : <span className={'chip ' + chipClass(t.status)} style={{ textTransform: 'capitalize' }}>{t.status}</span>}
                      {actions(t)}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}

        {/* CARDS VIEW */}
        {!loading && filtered.length > 0 && view === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '12px' }}>
            {filtered.map(t => {
              const l = leaseOf[t.id]; const st = standing(t)
              return (
                <a key={t.id} href={'/tenants/' + t.id} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderTop: '3px solid ' + statusColor(t.status), borderRadius: '12px', padding: '16px 18px', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: statusBg(t.status), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 700, color: statusColor(t.status), flexShrink: 0, border: '1.5px solid ' + statusColor(t.status) }}>
                        {t.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.full_name}{t.co_tenant_name ? ' & ' + t.co_tenant_name : ''}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {t.unit_address || t.properties?.address || 'No property'}</div>
                      </div>
                      {st ? <span className={'chip ' + st.cls}>{st.label}</span> : <span className={'chip ' + chipClass(t.status)} style={{ textTransform: 'capitalize' }}>{t.status}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Rent</div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: l ? 'var(--green)' : 'var(--text3)', marginTop: '2px' }}>{l ? fm(l.rent_amount) : '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Lease Ends</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>{l?.end_date ? formatDate(l.end_date) : '—'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.email || t.phone || ' '}</div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>{actions(t)}</div>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
