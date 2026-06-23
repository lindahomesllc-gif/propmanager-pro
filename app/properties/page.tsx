'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { getProperties, fm, share, supabase, type Property } from '@/lib/supabase'
import { SignedBg } from '@/components/SignedFile'

const typeIcon = (t) => ({ single_family: '🏠', condo: '🏢', duplex: '🏘', triplex: '🏘', quadplex: '🏘', multi_family: '🏗', commercial: '🏬', land: '🏞', primary_residence: '🏡' }[t] || '🏠')
const typeLabel = (t) => (t || 'property').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [filterEntity, setFilterEntity] = useState('all')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'cards' | 'table' | 'entity'>('cards')
  const [rentByProperty, setRentByProperty] = useState<Record<string, number>>({})
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')

  useEffect(() => {
    const ent = new URLSearchParams(window.location.search).get('entity')
    if (ent) setFilterEntity(ent)
    getProperties().then(data => { setProperties(data); setLoading(false) })
    supabase.from('entities').select('id, name').order('name').then(({ data }) => setEntities(data || []))
    supabase.from('leases').select('property_id, rent_amount').eq('status', 'executed').then(({ data }) => {
      const m: Record<string, number> = {}
      ;(data || []).forEach((l: any) => { if (l.property_id) m[l.property_id] = (m[l.property_id] || 0) + (l.rent_amount || 0) })
      setRentByProperty(m)
    })
  }, [])

  // assign (or change) a property's entity inline from the By-Entity view
  async function assignEntity(propertyId: string, entityId: string) {
    const name = entities.find(e => e.id === entityId)?.name || null
    await supabase.from('properties').update({ entity_id: entityId || null, owner_entity: name }).eq('id', propertyId)
    setProperties(prev => prev.map(p => p.id === propertyId ? ({ ...p, entity_id: entityId || null, owner_entity: name } as any) : p))
  }

  const cities = Array.from(new Set(properties.map(p => p.city).filter(Boolean))).sort()
  const ql = q.trim().toLowerCase()
  const filtered = properties.filter(p => {
    if (filterEntity === 'unassigned' ? (p as any).entity_id : filterEntity !== 'all' && (p as any).entity_id !== filterEntity) return false
    if (statusFilter !== 'all' && p.occupancy_status !== statusFilter) return false
    if (cityFilter !== 'all' && p.city !== cityFilter) return false
    if (ql) {
      const hay = [p.address, p.city, p.state, p.zip, p.type, (p as any).owner_entity].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(ql)) return false
    }
    return true
  })

  // net-worth totals reflect YOUR share (ownership %); full-owned props are unaffected
  const portfolioValue = filtered.reduce((s, p) => s + share(p.market_value, p), 0)
  const totalPurchased = filtered.reduce((s, p) => s + share(p.purchase_price, p), 0)
  const totalEquity = portfolioValue - totalPurchased
  const occupied = filtered.filter(p => p.occupancy_status === 'occupied')
  const vacant = filtered.filter(p => p.occupancy_status === 'vacant')
  const monthlyRentRoll = filtered.reduce((s, p) => s + (rentByProperty[p.id] || 0), 0)

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Properties</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {entities.length > 0 && (
            <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className='input' style={{ width: 'auto', fontSize: '12px' }}>
              <option value='all'>All Entities</option>
              <option value='unassigned'>— Unassigned —</option>
              {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '8px', padding: '3px', border: '0.5px solid var(--border)' }}>
            {([['cards', '⊞ Cards'], ['table', '☰ Table'], ['entity', '🏛 By Entity']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 11px', borderRadius: '6px', border: 'none', background: view === v ? 'var(--bg2)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontWeight: view === v ? 600 : 400 }}>{l}</button>
            ))}
          </div>
          <a href='/properties/new' className='btn btn-primary'>+ Add Property</a>
        </div>
      </div>

      {/* search + filters */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0, flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder='🔎 Search address, city, type…' className='input' style={{ flex: '1 1 240px', fontSize: '13px', maxWidth: '360px' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input' style={{ width: 'auto', fontSize: '12px' }}>
          <option value='all'>Any status</option>
          <option value='occupied'>Occupied</option>
          <option value='vacant'>Vacant</option>
        </select>
        {cities.length > 1 && (
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className='input' style={{ width: 'auto', fontSize: '12px' }}>
            <option value='all'>Any city</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(q || statusFilter !== 'all' || cityFilter !== 'all' || filterEntity !== 'all') && (
          <button onClick={() => { setQ(''); setStatusFilter('all'); setCityFilter('all'); setFilterEntity('all') }} className='btn btn-ghost' style={{ fontSize: '12px' }}>Clear</button>
        )}
        <span style={{ fontSize: '12px', color: 'var(--text3)', marginLeft: 'auto' }}>{filtered.length} of {properties.length}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Properties', value: properties.length, color: 'var(--text)' },
            { label: 'Occupied', value: occupied.length, color: 'var(--green)' },
            { label: 'Vacant', value: vacant.length, color: vacant.length > 0 ? 'var(--amber)' : 'var(--green)' },
            { label: 'Monthly Rent', value: fm(monthlyRentRoll), color: 'var(--green)' },
            { label: 'Portfolio Value', value: fm(portfolioValue), color: 'var(--text)' },
            { label: 'Total Equity', value: fm(totalEquity), color: 'var(--green)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '64px' }} />)}</div>
        ) : view === 'cards' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '14px' }}>
            {filtered.map(p => {
              const equity = (p.market_value || 0) - (p.purchase_price || 0)
              const isOccupied = p.occupancy_status === 'occupied'
              return (
                <div key={p.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  {(p as any).cover_photo_url && <SignedBg src={(p as any).cover_photo_url} style={{ height: '130px', background: 'var(--bg3)', borderBottom: '0.5px solid var(--border)' }} />}
                  <div style={{ padding: '16px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: isOccupied ? 'var(--green-bg)' : 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                      {typeIcon(p.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{p.city}, {p.state} · {typeLabel(p.type)}{p.ownership_percentage != null && p.ownership_percentage < 100 ? ' · ' + p.ownership_percentage + '% owned' : ''}</div>
                    </div>
                    <span className={'chip ' + (isOccupied ? 'chip-g' : 'chip-a')} style={{ flexShrink: 0 }}>
                      {isOccupied ? 'Occupied' : 'Vacant'}
                    </span>
                  </div>
                  <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Market Value</div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--green)', marginTop: '2px' }}>{fm(p.market_value)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Equity</div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: equity >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '2px' }}>{fm(equity)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Purchased</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>{fm(p.purchase_price)}</div>
                    </div>
                  </div>
                  <div style={{ padding: '10px 18px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {rentByProperty[p.id] > 0 && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--green-bg)', color: 'var(--green)', border: '0.5px solid var(--green)', fontWeight: 600 }}>💰 {fm(rentByProperty[p.id])}/mo · {fm(rentByProperty[p.id] * 12)}/yr</span>}
                    {p.bedrooms && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--text2)', border: '0.5px solid var(--border)' }}>{p.bedrooms}bd / {p.bathrooms}ba</span>}
                    {p.sqft && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--text2)', border: '0.5px solid var(--border)' }}>{p.sqft.toLocaleString()} sqft</span>}
                    {p.year_built && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--text2)', border: '0.5px solid var(--border)' }}>Built {p.year_built}</span>}
                    {p.hoa && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg3)', color: 'var(--blue)', border: '0.5px solid var(--border)' }}>HOA</span>}
                  </div>
                  <div style={{ padding: '8px 18px', display: 'flex', gap: '12px', borderTop: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
                    {[['💰 Finances', '/properties/' + p.id + '?tab=financials'], ['📁 Documents', '/properties/' + p.id + '?tab=documents'], ['🔧 Maintenance', '/maintenance?property=' + p.id]].map(([l, href]) => (
                      <a key={l} href={href} style={{ fontSize: '11px', color: 'var(--text2)', textDecoration: 'none' }}>{l}</a>
                    ))}
                  </div>
                  <div style={{ padding: '10px 18px', display: 'flex', gap: '8px', borderTop: '0.5px solid var(--border)' }}>
                    <a href={'/properties/' + p.id} style={{ flex: 1, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>View Details</a>
                    <a href={'/properties/' + p.id + '/edit'} style={{ background: 'transparent', color: 'var(--text2)', border: '0.5px solid var(--border2)', borderRadius: '7px', padding: '7px 12px', fontSize: '12px', textDecoration: 'none' }}>Edit</a>
                  </div>
                </div>
              )
            })}
          </div>
        ) : view === 'table' ? (
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Address', 'Type', 'Ownership', 'Purchase Price', 'Market Value', 'Equity', 'Rent/mo', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <a href={'/properties/' + p.id} style={{ textDecoration: 'none' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.address}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{p.city}, {p.state}</div>
                      </a>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)', textTransform: 'capitalize' }}>{typeLabel(p.type)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{p.owner_entity || 'Self'}{p.ownership_percentage != null && p.ownership_percentage < 100 ? ' (' + p.ownership_percentage + '%)' : ''}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{fm(p.purchase_price)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--green)', fontWeight: 600 }}>{fm(p.market_value)}</td>
                    <td style={{ padding: '10px 14px', color: (p.market_value || 0) - (p.purchase_price || 0) >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fm((p.market_value || 0) - (p.purchase_price || 0))}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--green)', fontWeight: 600 }}>{fm(rentByProperty[p.id] || 0)}</td>
                    <td style={{ padding: '10px 14px' }}><span className={'chip ' + (p.occupancy_status === 'occupied' ? 'chip-g' : 'chip-a')} style={{ textTransform: 'capitalize' }}>{p.occupancy_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // ===== By Entity =====
          (() => {
            const groups = entities.map(en => ({ en, props: properties.filter(p => (p as any).entity_id === en.id) }))
            const unassigned = properties.filter(p => !(p as any).entity_id)
            const Row = ({ p, showAssign }: { p: any; showAssign: boolean }) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '18px' }}>{typeIcon(p.type)}</div>
                <a href={'/properties/' + p.id} style={{ textDecoration: 'none', flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{p.address}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{p.city}, {p.state} · {typeLabel(p.type)}{p.ownership_percentage != null && p.ownership_percentage < 100 ? ' · ' + p.ownership_percentage + '%' : ''}</div>
                </a>
                <div style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 600 }}>{fm(p.market_value)}</div>
                <span className={'chip ' + (p.occupancy_status === 'occupied' ? 'chip-g' : 'chip-a')} style={{ textTransform: 'capitalize' }}>{p.occupancy_status}</span>
                {showAssign && (
                  <select value='' onChange={e => assignEntity(p.id, e.target.value)} className='input' style={{ width: 'auto', fontSize: '11px' }}>
                    <option value=''>Assign entity…</option>
                    {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                  </select>
                )}
                <a href={'/properties/' + p.id + '/edit'} style={{ fontSize: '11px', color: 'var(--text2)', textDecoration: 'none' }}>Edit</a>
              </div>
            )
            return (
              <div style={{ display: 'grid', gap: '14px' }}>
                {groups.map(({ en, props }) => (
                  <div key={en.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg3)', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>🏛 {en.name} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text3)' }}>· {props.length} propert{props.length === 1 ? 'y' : 'ies'} · {fm(props.reduce((s: number, p: any) => s + (p.market_value || 0), 0))}</span></div>
                      <a href={'/properties/new?entity=' + en.id} className='btn btn-ghost' style={{ fontSize: '11px' }}>+ Add property</a>
                    </div>
                    {props.length === 0 ? <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text3)' }}>No properties assigned yet.</div> : props.map((p: any) => <Row key={p.id} p={p} showAssign={false} />)}
                  </div>
                ))}
                <div style={{ background: 'var(--bg2)', border: '0.5px solid ' + (unassigned.length ? 'var(--amber)' : 'var(--border)'), borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg3)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>🏷 Unassigned / Self <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text3)' }}>· {unassigned.length}</span></div>
                    <a href='/properties/new' className='btn btn-ghost' style={{ fontSize: '11px' }}>+ Add property</a>
                  </div>
                  {unassigned.length === 0 ? <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--green)' }}>Every property is assigned to an entity 🎉</div> : unassigned.map((p: any) => <Row key={p.id} p={p} showAssign={true} />)}
                </div>
                {entities.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text3)', padding: '4px' }}>No entities yet — create them on the <a href='/entities' style={{ color: 'var(--green)' }}>Entities</a> page, then come back to assign properties.</div>}
              </div>
            )
          })()
        )}
      </div>
    </AppShell>
  )
}