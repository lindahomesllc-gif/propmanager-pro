'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, share, formatDate, loanTypeLabel, projectCost } from '@/lib/supabase'
import UnitsManager from '@/components/UnitsManager'
import AssetsManager from '@/components/AssetsManager'
import PaintManager from '@/components/PaintManager'
import AmortizationModal from '@/components/AmortizationModal'
import MortgageFormModal from '@/components/MortgageFormModal'

export default function PropertyDetailPage({ params }) {
  const [property, setProperty] = useState(null)
  const [tenants, setTenants] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [mortgages, setMortgages] = useState([])
  const [leases, setLeases] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [scheduleFor, setScheduleFor] = useState<any>(null)
  const [showMortgageForm, setShowMortgageForm] = useState(false)
  const [editingMortgage, setEditingMortgage] = useState<any>(null)
  const onMortgageSaved = (row: any, isEdit: boolean) => {
    setMortgages((prev: any) => isEdit ? prev.map((x: any) => x.id === row.id ? row : x) : [...prev, row])
    setShowMortgageForm(false)
  }
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    const qTab = new URLSearchParams(window.location.search).get('tab')
    if (qTab) setTab(qTab)
  }, [])

  useEffect(() => {
    const id = params.id
    Promise.all([
      supabase.from('properties').select('*').eq('id', id).single(),
      supabase.from('tenants').select('*').eq('property_id', id).order('unit_address', { ascending: true }),
      supabase.from('payments').select('*').eq('property_id', id).order('due_date', { ascending: false }).limit(10),
      supabase.from('expenses').select('*').eq('property_id', id).order('expense_date', { ascending: false }).limit(10),
      supabase.from('mortgages').select('*, properties(address, city, state)').eq('property_id', id),
      supabase.from('leases').select('*, tenants(full_name)').eq('property_id', id).order('created_at', { ascending: false }),
      supabase.from('maintenance').select('*').eq('property_id', id).order('created_at', { ascending: false }),
    ]).then(([p, t, pay, exp, mtg, ls, mt]) => {
      setProperty(p.data)
      setTenants(t.data || [])
      setPayments(pay.data || [])
      setExpenses(exp.data || [])
      setMortgages(mtg.data || [])
      setLeases(ls.data || [])
      setMaintenance(mt.data || [])
      setLoading(false)
    })
  }, [params.id])

  async function uploadDoc(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const { data: { user: _u } } = await supabase.auth.getUser()
    const path = (_u?.id || 'unknown') + '/properties/' + params.id + '/' + Date.now() + '_' + file.name
    const { error: upErr } = await supabase.storage.from('lease-documents').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(path)
    const existingDocs = property.photo_urls || []
    await supabase.from('properties').update({ photo_urls: [...existingDocs, urlData.publicUrl] }).eq('id', params.id)
    setProperty(p => ({ ...p, photo_urls: [...(p.photo_urls || []), urlData.publicUrl] }))
    setUploading(false)
  }

  async function removeDoc(url) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    const next = (property.photo_urls || []).filter(u => u !== url)
    const { error } = await supabase.from('properties').update({ photo_urls: next }).eq('id', params.id)
    if (error) { alert('Error: ' + error.message); return }
    setProperty(p => ({ ...p, photo_urls: next }))
    // best-effort: also remove the underlying file from storage
    const marker = '/lease-documents/'
    const idx = url.indexOf(marker)
    if (idx !== -1) { try { await supabase.storage.from('lease-documents').remove([decodeURIComponent(url.slice(idx + marker.length))]) } catch {} }
  }

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>
  if (!property) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Property not found.</div></AppShell>

  const p = property
  const totalRent = payments.filter(x => x.status === 'paid').reduce((s, x) => s + (x.amount_paid || 0), 0)
  const totalExp = expenses.reduce((s, x) => s + (x.amount || 0), 0)
  const equity = (p.market_value || 0) - (p.purchase_price || 0)
  const monthlyRent = leases.filter((l: any) => l.status === 'executed').reduce((s: number, l: any) => s + (l.rent_amount || 0), 0)
  // project cost breakdown (build or buy)
  const pc = (k: string) => Number((p as any)[k]) || 0
  const isBuild = p.deal_type === 'build'
  const costRows: [string, number][] = isBuild
    ? [['Land / Lot', pc('land_cost')], ['Construction', pc('construction_cost')], ['Soft costs', pc('soft_costs')], ['Rehab', pc('rehab_cost')], ['Closing', pc('closing_costs')], ['Financing', pc('financing_costs')]]
    : [['Purchase Price', pc('purchase_price')], ['Rehab', pc('rehab_cost')], ['Closing', pc('closing_costs')], ['Financing', pc('financing_costs')]]
  const totalProjectCost = projectCost(p)
  const createdEquity = (p.market_value || 0) - totalProjectCost
  const hasCostBreakdown = isBuild || costRows.some(([k, v]) => k !== 'Purchase Price' && v > 0)
  // interest-only loans owe their full amount until the balloon — use original_amount so
  // equity isn't overstated if current_balance reflects a partial construction draw.
  const effBal = (m: any) => m.interest_only ? (Number(m.original_amount) || Number(m.current_balance) || 0) : (Number(m.current_balance) || 0)
  const loanBalance = mortgages.filter((m: any) => !m.is_paid_off).reduce((s: number, m: any) => s + effBal(m), 0)
  const trueEquity = (p.market_value || 0) - loanBalance
  const extra = p.notes ? JSON.parse(p.notes.startsWith('{') ? p.notes : '{}') : {}
  const isDuplex = p.type === 'duplex' || p.type === 'multi_family'

  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }
  const lbl = { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }
  // Cohesive flow: identity → money → income/tenancy → the physical asset → reference
  const tabs = ['overview', 'financials', 'insurance', 'units', 'maintenance', 'appliances', 'paint', 'utilities', 'documents', 'history']
  const tabLabels = { overview: 'Overview', units: 'Units & Rooms', maintenance: 'Maintenance', appliances: 'Appliances & Systems', paint: 'Paint & Materials', financials: 'Financials', insurance: 'Insurance & Tax', utilities: 'Utilities & Schools', documents: 'Documents', history: 'Notes & History' }

  return (
    <AppShell>
      <div style={{ background: 'var(--bg2)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ padding: '10px 20px 0', fontSize: '11px', color: 'var(--text3)', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button onClick={() => window.history.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: 0 }}>← Back</button>
          <a href='/properties' style={{ color: 'var(--text3)', textDecoration: 'none' }}>All Properties</a>
        </div>
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: p.cover_photo_url ? `center/cover no-repeat url(${p.cover_photo_url})` : (p.occupancy_status === 'occupied' ? 'var(--green-bg)' : 'var(--amber-bg)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>
            {p.cover_photo_url ? '' : (({'single_family':'🏠','condo':'🏢','duplex':'🏘','triplex':'🏘','quadplex':'🏘','multi_family':'🏗','commercial':'🏬','land':'🏞','primary_residence':'🏡'})[p.type] || '🏠')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{p.address}</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>{p.city}, {p.state} {p.zip} · {(p.type || '').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <a href={'/properties/' + p.id + '/edit'} className='btn btn-ghost'>Edit</a>
            <span style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, background: p.occupancy_status === 'occupied' ? 'var(--green-bg)' : 'var(--amber-bg)', color: p.occupancy_status === 'occupied' ? 'var(--green)' : 'var(--amber)', border: '0.5px solid ' + (p.occupancy_status === 'occupied' ? 'var(--green)' : 'var(--amber)') }}>
              {p.occupancy_status === 'occupied' ? 'Occupied' : 'Vacant'}
            </span>
          </div>
        </div>
        <div style={{ padding: '12px 20px 16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Market Value</div><div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>{fm(p.market_value)}</div></div>
          {monthlyRent > 0 && <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Rent Revenue</div><div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>{fm(monthlyRent)}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text3)' }}>/mo</span></div><div style={{ fontSize: '11px', color: 'var(--text3)' }}>{fm(monthlyRent * 12)}/yr</div></div>}
          <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Equity</div><div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: trueEquity >= 0 ? 'var(--green)' : 'var(--red)' }}>{fm(trueEquity)}</div><div style={{ fontSize: '10px', color: 'var(--text3)' }}>value − {fm(loanBalance)} debt</div></div>
          <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{isBuild ? 'Total Cost' : 'Purchased'}</div><div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>{fm(isBuild ? totalProjectCost : p.purchase_price)}</div></div>
          {p.bedrooms && <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Beds/Baths</div><div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>{p.bedrooms}bd / {p.bathrooms}ba</div></div>}
          {p.sqft && <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Sq Ft</div><div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>{p.sqft.toLocaleString()}</div></div>}
          {p.ownership_percentage != null && p.ownership_percentage < 100 && (
            <>
              <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>You Own</div><div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--amber)' }}>{p.ownership_percentage}%</div></div>
              <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Your Share</div><div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>{fm(share(p.market_value, p))}</div></div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', overflowX: 'auto', flexShrink: 0 }}>
        {tabs.map(t => {
          const groupStart = t === 'units' || t === 'utilities'   // start of the "asset" and "reference" groups
          return (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent', background: 'transparent', color: tab === t ? 'var(--green)' : 'var(--text2)', fontWeight: tab === t ? 600 : 400, marginLeft: groupStart ? '14px' : 0, borderLeft: groupStart ? '0.5px solid var(--border)' : 'none', paddingLeft: groupStart ? '20px' : '16px' }}>{tabLabels[t]}</button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--green-bg)', border: '0.5px solid var(--green)', borderRadius: '12px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rent Collected</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }}>{fm(totalRent)}</div>
                </div>
                <div style={{ fontSize: '32px', opacity: 0.4 }}>💰</div>
              </div>
              <div style={{ background: totalExp > 0 ? 'var(--amber-bg)' : 'var(--bg2)', border: '0.5px solid ' + (totalExp > 0 ? 'var(--amber)' : 'var(--border)'), borderRadius: '12px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expenses</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 700, color: totalExp > 0 ? 'var(--amber)' : 'var(--text3)', marginTop: '4px' }}>{fm(totalExp)}</div>
                </div>
                <div style={{ fontSize: '32px', opacity: 0.4 }}>📋</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={card}>
                  <div style={secTtl}>🏠 Property Info</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      ['🏠 Type', p.type ? p.type.replace(/_/g, ' ') : '—'],
                      ['🛏 Bedrooms', p.bedrooms || '—'],
                      ['🚿 Bathrooms', p.bathrooms || '—'],
                      ['📐 Sq Ft', p.sqft ? p.sqft.toLocaleString() : '—'],
                      ['🏗 Year Built', p.year_built || '—'],
                      ['🏢 Ownership', (p.owner_entity || 'Self') + (p.ownership_percentage != null && p.ownership_percentage < 100 ? ' (' + p.ownership_percentage + '%)' : '')],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                        <div style={lbl}>{k}</div>
                        <div style={{ ...val, textTransform: 'capitalize' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {p.hoa && (
                  <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)' }}>HOA</div>
                      <a href={'/properties/' + p.id + '/edit#hoa'} className='btn btn-ghost'>Edit HOA</a>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase' }}>HOA Name</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }}>{p.hoa_name || '—'}</div>
                      </div>
                      <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase' }}>Monthly Fee</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }}>{p.hoa_fee ? '$' + p.hoa_fee + '/mo' : '—'}</div>
                      </div>
                      <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase' }}>Contact</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }}>{p.hoa_contact || '—'}</div>
                      </div>
                    </div>
                  </div>
                )}
                {isDuplex && (
                  <div style={card}>
                    <div style={secTtl}>🏘 Units</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {tenants.length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No tenants assigned.</div>
                      ) : tenants.map(t => (
                        <div key={t.id} style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', border: '0.5px solid var(--border)' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t.unit_address || 'Unit'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>{t.full_name?.charAt(0)}</div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{t.full_name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{t.email}</div>
                            </div>
                          </div>
                          <a href={'/tenants/' + t.id} style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none', background: 'var(--green-bg)', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>View Tenant →</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!isDuplex && (
                  <div style={card}>
                    <div style={secTtl}>👥 Tenants</div>
                    {tenants.length === 0 ? (
                      <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No tenants assigned.</div>
                    ) : tenants.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>{t.full_name?.charAt(0)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{t.full_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{t.email}{t.phone ? ' · ' + t.phone : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: t.status === 'active' ? 'var(--green-bg)' : 'var(--bg3)', color: t.status === 'active' ? 'var(--green)' : 'var(--text3)' }}>{t.status}</span>
                          <a href={'/tenants/' + t.id} style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>View →</a>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: '12px' }}><a href={'/tenants/new?property=' + p.id} className='btn btn-ghost'>+ Add Tenant</a></div>
                  </div>
                )}
              </div>
              <div>
                <div style={card}>
                  <div style={secTtl}>💳 Recent Payments</div>
                  {payments.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No payments recorded.</div>
                  ) : payments.slice(0, 5).map(pay => (
                    <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>{formatDate(pay.due_date)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{pay.payment_method || 'manual'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: pay.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>{fm(pay.amount_paid)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{pay.status}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '12px' }}><a href='/payments/new' className='btn btn-ghost'>+ Record Payment</a></div>
                </div>
                <div style={card}>
                  <div style={secTtl}>💰 Recent Expenses</div>
                  {expenses.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No expenses recorded.</div>
                  ) : expenses.slice(0, 5).map(exp => (
                    <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text)', textTransform: 'capitalize' }}>{exp.category.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{formatDate(exp.expense_date)}</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--amber)' }}>{fm(exp.amount)}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: '12px' }}><a href='/expenses/new' className='btn btn-ghost'>+ Add Expense</a></div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'units' && <UnitsManager propertyId={p.id} tenants={tenants} />}

        {tab === 'maintenance' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={secTtl}>🔧 Maintenance</div>
              <a href={'/maintenance?property=' + p.id} className='btn btn-ghost' style={{ fontSize: '12px' }}>Open in Maintenance →</a>
            </div>
            {maintenance.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No maintenance requests for this property.</div> : maintenance.map((m: any) => (
              <a key={m.id} href={'/maintenance/' + m.id} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px', borderLeft: '3px solid ' + (m.priority === 'emergency' ? 'var(--red)' : m.priority === 'high' ? 'var(--amber)' : 'var(--blue)') }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.title}</div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: 'var(--bg2)', color: m.status === 'completed' ? 'var(--green)' : 'var(--text2)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{(m.status || '').replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>{(m.priority || 'normal') + ' priority'}{m.created_at ? ' · ' + formatDate(m.created_at) : ''}{m.cost ? ' · ' + fm(m.cost) : ''}</div>
                </div>
              </a>
            ))}
          </div>
        )}

        {tab === 'appliances' && <AssetsManager propertyId={p.id} />}

        {tab === 'paint' && <PaintManager propertyId={p.id} />}

        {tab === 'financials' && (
          <>
            {/* Value & Equity — what it's worth now and your stake */}
            <div style={card}>
              <div style={secTtl}>📈 Value &amp; Equity</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[
                  [isBuild ? 'As-Built Value' : 'Market Value', fm(p.market_value)],
                  ['Loan Debt', loanBalance > 0 ? fm(loanBalance) : '—'],
                  ['Equity', fm(trueEquity)],
                  ['Cash Invested', p.cash_invested ? fm(p.cash_invested) : '—'],
                  [isBuild ? 'Completed' : 'Purchased', p.purchase_date ? formatDate(p.purchase_date) : '—'],
                  ['Ownership', (p.owner_entity || 'Self') + (p.ownership_percentage != null && p.ownership_percentage < 100 ? ' · ' + p.ownership_percentage + '%' : '')],
                  ...(p.ownership_percentage != null && p.ownership_percentage < 100 ? [
                    ['Your Share (Value)', fm(share(p.market_value, p))],
                    ['Your Share (Equity)', fm(share(trueEquity, p))],
                  ] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={val}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Basis — what it cost you to acquire/build */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={secTtl}>🧱 Cost Basis <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text3)' }}>— {isBuild ? 'built ground-up' : 'bought existing'}</span></div>
                {isBuild && <a href={'/analyze?property=' + p.id} className='btn btn-ghost' style={{ fontSize: '11px' }}>🏗 Rent vs Sell →</a>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {costRows.filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={val}>{fm(v)}</div>
                  </div>
                ))}
                <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '10px 12px', border: '0.5px solid var(--border)' }}>
                  <div style={lbl}>Total Project Cost</div>
                  <div style={{ ...val, color: 'var(--text)' }}>{fm(totalProjectCost)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)' }}>your cost basis</div>
                </div>
                <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '10px 12px', border: '0.5px solid var(--border)' }}>
                  <div style={lbl}>Created Equity</div>
                  <div style={{ ...val, color: !p.market_value ? 'var(--text3)' : createdEquity >= 0 ? 'var(--green)' : 'var(--red)' }}>{p.market_value ? fm(createdEquity) : '—'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)' }}>value − cost</div>
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={secTtl}>🏦 Mortgage{mortgages.length > 1 ? 's' : ''}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a href={'/dscr?property=' + p.id} className='btn btn-ghost' style={{ fontSize: '12px' }}>📄 DSCR Package</a>
                  <a href={'/mortgage'} className='btn btn-ghost'>Manage</a>
                </div>
              </div>
              {mortgages.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No mortgage on this property. <span onClick={() => { setEditingMortgage(null); setShowMortgageForm(true) }} style={{ color: 'var(--green)', cursor: 'pointer', fontWeight: 600 }}>+ Add one</span></div>
              ) : mortgages.map(m => (
                <div key={m.id} style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '14px', marginBottom: '8px', borderLeft: '3px solid ' + (m.is_paid_off ? 'var(--green)' : 'var(--blue)') }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.lender_name || 'Lender'} {m.is_paid_off && <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>· PAID OFF</span>}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{loanTypeLabel(m.loan_type)} · {m.term_years}yr · {m.interest_rate}%{m.interest_only ? ' · interest-only' : ''}{m.balloon_date ? ' · 🎈 balloon ' + formatDate(m.balloon_date) : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, color: m.is_paid_off ? 'var(--green)' : 'var(--text)' }}>{fm(effBal(m))}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{m.interest_only ? 'owed (interest-only)' : 'balance'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'var(--text3)' }}>
                    <span>Pmt {fm(m.monthly_payment)}/mo</span>
                    <span>Orig {fm(m.original_amount)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    <button onClick={() => setScheduleFor(m)} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 10px' }}>📅 Amortization</button>
                    <button onClick={() => { setEditingMortgage(m); setShowMortgageForm(true) }} className='btn btn-ghost' style={{ fontSize: '11px', padding: '5px 10px' }}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'insurance' && (
          <>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={secTtl}>🛡 Insurance</div>
                <a href={'/properties/' + p.id + '/edit#insurance'} className='btn btn-ghost'>Edit</a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[
                  ['Insurance Company', p.insurance_company || '—'],
                  ['Policy Number', p.insurance_policy || '—'],
                  ['Annual Premium', p.insurance_premium ? fm(p.insurance_premium) : '—'],
                  ['Policy Start', p.insurance_start ? formatDate(p.insurance_start) : '—'],
                  ['Policy Expires', p.insurance_expires ? formatDate(p.insurance_expires) : '—'],
                  ['Agent', p.insurance_agent || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={val}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={secTtl}>🧾 Property Tax</div>
                <a href={'/properties/' + p.id + '/edit#tax'} className='btn btn-ghost'>Edit</a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[
                  ['County', p.county || '—'],
                  ['Parcel ID', p.parcel_id || '—'],
                  ['Alt Key', p.alt_key || '—'],
                  ['Annual Tax', p.annual_tax ? fm(p.annual_tax) : '—'],
                  ['Assessed Value', p.assessed_value ? fm(p.assessed_value) : '—'],
                  ['Property Desc', p.prop_description || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={val}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'utilities' && (
          <>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={secTtl}>⚡ Utility Companies</div>
                <a href={'/properties/' + p.id + '/edit#utilities'} className='btn btn-ghost'>Edit</a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[
                  ['Electric', p.utility_electric || '—'],
                  ['Water', p.utility_water || '—'],
                  ['Gas', p.utility_gas || '—'],
                  ['Trash', p.utility_trash || '—'],
                  ['Internet', p.utility_internet || '—'],
                  ['Cable', p.utility_cable || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={val}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={secTtl}>🎓 Schools</div>
                <a href={'/properties/' + p.id + '/edit#utilities'} className='btn btn-ghost'>Edit</a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[
                  ['Elementary', p.school_elementary || '—'],
                  ['Middle School', p.school_middle || '—'],
                  ['High School', p.school_high || '—'],
                  ['School District', p.school_district || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={val}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'documents' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={secTtl}>📄 Property Documents</div>
              <button className='btn btn-primary' onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading...' : '⬆ Upload Document'}</button>
            </div>
            <input ref={fileRef} type='file' accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' style={{ display: 'none' }} onChange={uploadDoc} />
            {(!p.photo_urls || p.photo_urls.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
                <div style={{ fontSize: '13px' }}>No documents uploaded yet.</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>Upload property appraiser pages, insurance docs, deeds, etc.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {p.photo_urls.map((url, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '0.5px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text)' }}>📄 {decodeURIComponent(url.split('/').pop().split('_').slice(1).join('_')) || 'Document ' + (i + 1)}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={url} target='_blank' className='btn btn-ghost'>View</a>
                      <a href={url} download className='btn btn-ghost'>Download</a>
                      <button onClick={() => removeDoc(url)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (() => {
          const events = [
            ...payments.map((x: any) => ({ date: x.paid_date || x.due_date, icon: '💰', text: 'Rent ' + (x.status || '') + ' — ' + fm(x.amount_paid || x.amount_due), href: '/payments' })),
            ...expenses.map((x: any) => ({ date: x.expense_date, icon: '🧾', text: (x.category || 'expense').replace(/_/g, ' ') + ' — ' + fm(x.amount) + (x.description ? ' (' + x.description + ')' : ''), href: '/expenses' })),
            ...maintenance.map((x: any) => ({ date: x.created_at, icon: '🔧', text: x.title + ' (' + (x.status || '').replace(/_/g, ' ') + ')', href: '/maintenance/' + x.id })),
            ...leases.map((x: any) => ({ date: x.created_at || x.start_date, icon: '📄', text: 'Lease ' + (x.status || '') + ' — ' + (x.tenants?.full_name || '') + ' ' + fm(x.rent_amount) + '/mo', href: '/leases/' + x.id })),
          ].filter(e => e.date).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30)
          return (
            <>
              <div style={card}>
                <div style={secTtl}>📝 Notes</div>
                {p.notes ? <div style={{ fontSize: '13px', color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{p.notes}</div> : <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No notes yet. Add them on the <a href={'/properties/' + p.id + '/edit'} style={{ color: 'var(--green)' }}>Edit</a> page.</div>}
              </div>
              <div style={card}>
                <div style={secTtl}>🕘 Activity History</div>
                {events.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text3)' }}>No recent activity for this property.</div> : events.map((ev, i) => (
                  <a key={i} href={ev.href} style={{ textDecoration: 'none', display: 'flex', gap: '10px', padding: '9px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <span style={{ fontSize: '15px', flexShrink: 0 }}>{ev.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text)' }}>{ev.text}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{formatDate(ev.date)}</div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )
        })()}

      </div>
      {scheduleFor && <AmortizationModal mortgage={scheduleFor} onClose={() => setScheduleFor(null)} />}
      {showMortgageForm && <MortgageFormModal mortgage={editingMortgage} properties={[{ id: p.id, address: p.address }]} lockProperty onClose={() => setShowMortgageForm(false)} onSaved={onMortgageSaved} />}
    </AppShell>
  )
}