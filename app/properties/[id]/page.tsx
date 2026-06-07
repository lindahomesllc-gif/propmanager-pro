'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, share, formatDate } from '@/lib/supabase'
import UnitsManager from '@/components/UnitsManager'

export default function PropertyDetailPage({ params }) {
  const [property, setProperty] = useState(null)
  const [tenants, setTenants] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    const id = params.id
    Promise.all([
      supabase.from('properties').select('*').eq('id', id).single(),
      supabase.from('tenants').select('*').eq('property_id', id).order('unit_address', { ascending: true }),
      supabase.from('payments').select('*').eq('property_id', id).order('due_date', { ascending: false }).limit(10),
      supabase.from('expenses').select('*').eq('property_id', id).order('expense_date', { ascending: false }).limit(10),
    ]).then(([p, t, pay, exp]) => {
      setProperty(p.data)
      setTenants(t.data || [])
      setPayments(pay.data || [])
      setExpenses(exp.data || [])
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

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>
  if (!property) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Property not found.</div></AppShell>

  const p = property
  const totalRent = payments.filter(x => x.status === 'paid').reduce((s, x) => s + (x.amount_paid || 0), 0)
  const totalExp = expenses.reduce((s, x) => s + (x.amount || 0), 0)
  const equity = (p.market_value || 0) - (p.purchase_price || 0)
  const extra = p.notes ? JSON.parse(p.notes.startsWith('{') ? p.notes : '{}') : {}
  const isDuplex = p.type === 'duplex' || p.type === 'multi_family'

  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }
  const lbl = { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }
  const tabs = ['overview', 'units', 'financials', 'insurance', 'utilities', 'documents']
  const tabLabels = { overview: 'Overview', units: 'Units & Rooms', financials: 'Financials', insurance: 'Insurance & Tax', utilities: 'Utilities & Schools', documents: 'Documents' }

  return (
    <AppShell>
      <div style={{ background: 'var(--bg2)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ padding: '10px 20px 0', fontSize: '11px', color: 'var(--text3)' }}>
          <a href='/properties' style={{ color: 'var(--text3)', textDecoration: 'none' }}>← Properties</a>
        </div>
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: p.occupancy_status === 'occupied' ? 'var(--green-bg)' : 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>
            {({'single_family':'🏠','condo':'🏢','duplex':'🏘','triplex':'🏘','quadplex':'🏘','multi_family':'🏗','commercial':'🏬'})[p.type] || '🏠'}
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
          <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Equity</div><div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>{fm(equity)}</div></div>
          <div><div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Purchased</div><div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>{fm(p.purchase_price)}</div></div>
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
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent', background: 'transparent', color: tab === t ? 'var(--green)' : 'var(--text2)', fontWeight: tab === t ? 600 : 400 }}>{tabLabels[t]}</button>
        ))}
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
                </div>
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

        {tab === 'financials' && (
          <>
            <div style={card}>
              <div style={secTtl}>📈 Purchase & Value</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[
                  ['Purchase Price', fm(p.purchase_price)],
                  ['Purchase Date', p.purchase_date ? formatDate(p.purchase_date) : '—'],
                  ['Market Value', fm(p.market_value)],
                  ['Equity', fm(equity)],
                  ['Appreciation', p.purchase_price ? ((equity / p.purchase_price) * 100).toFixed(1) + '%' : '—'],
                  ['Ownership', (p.owner_entity || 'Self') + (p.ownership_percentage != null && p.ownership_percentage < 100 ? ' · ' + p.ownership_percentage + '%' : '')],
                  ...(p.ownership_percentage != null && p.ownership_percentage < 100 ? [
                    ['Your Share (Value)', fm(share(p.market_value, p))],
                    ['Your Share (Equity)', fm(share(equity, p))],
                  ] : []),
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
                <div style={secTtl}>🏦 Mortgage</div>
                <a href={'/mortgage'} className='btn btn-ghost'>Manage Mortgages</a>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>View and manage mortgage details in the Mortgage section.</div>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  )
}