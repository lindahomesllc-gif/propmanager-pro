'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, fm, share, formatDate, computeReturns, nextAnnualReportDue, monthlyPI, propertyMoves } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import GettingStarted from '@/components/GettingStarted'
import GoalsCard from '@/components/GoalsCard'

// Customizable dashboard: each section is a keyed widget the user can reorder or hide.
// investor-first: financial position → opportunities → goals → problems → income → ops
const DEFAULT_ORDER = ['portfolio', 'moves', 'goals', 'attention', 'rentGaps', 'operations', 'rentCollection', 'thisMonth', 'rentStatus', 'quickActions', 'propertiesTenants']
// Bump when DEFAULT_ORDER changes meaningfully so an older saved order is superseded
// once (the new investor-first order re-applies); the user's hidden choices are kept,
// and any reorder they make afterward persists under the current version.
const LAYOUT_VERSION = 2
const WIDGET_LABELS: Record<string, string> = {
  portfolio: '📈 Portfolio', goals: '🎯 Goals', operations: '🏠 Operations',
  attention: '⚠️ Needs Attention', moves: '💡 Moves to Consider', rentGaps: '💸 Rent vs Market', thisMonth: '📅 This Month', rentCollection: '💰 Rent Collection',
  rentStatus: '🧾 Rent Status', quickActions: '⚡ Quick Actions', propertiesTenants: '🏠 Properties & Tenants',
}

export default function DashboardPage() {
  const [editMode, setEditMode] = useState(false)
  const [layout, setLayout] = useState<{ order: string[]; hidden: string[] }>({ order: DEFAULT_ORDER, hidden: [] })
  const [data, setData] = useState({ properties: [], tenants: [], payments: [], expenses: [], leases: [], maintenance: [], mortgages: [], assets: [], entities: [], schedules: [], units: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('properties').select('*'),
      supabase.from('tenants').select('*, properties(address)').eq('status', 'active'),
      supabase.from('payments').select('*, tenants(full_name), properties(address)').order('due_date', { ascending: false }).limit(50),
      supabase.from('expenses').select('*'),
      supabase.from('leases').select('*, tenants(full_name), properties(address)').eq('status', 'executed'),
      supabase.from('maintenance').select('*, properties(address)').in('status', ['open', 'scheduled', 'in_progress']),
      supabase.from('mortgages').select('*, properties(address)').eq('is_paid_off', false),
      supabase.from('property_assets').select('*, properties(address)'),
      supabase.from('entities').select('*'),
      supabase.from('maintenance_schedules').select('*, properties(address)').eq('active', true),
      supabase.from('units').select('id, property_id, label, market_rent'),
    ]).then(([p, t, pay, exp, l, m, mo, as, en, ms, un]) => {
      setData({ properties: p.data || [], tenants: t.data || [], payments: pay.data || [], expenses: exp.data || [], leases: l.data || [], maintenance: m.data || [], mortgages: mo.data || [], assets: as.data || [], entities: en.data || [], schedules: ms.data || [], units: un.data || [] })
      setLoading(false)
    })
  }, [])

  // load saved layout once; merge with defaults so newly-added widgets always appear
  useEffect(() => {
    let saved: any = null
    try { saved = JSON.parse(localStorage.getItem('dashboardLayout') || 'null') } catch {}
    // If the saved layout predates the current LAYOUT_VERSION, discard its order so the
    // new investor-first default applies; keep the user's hidden choices either way.
    const stale = saved?.v !== LAYOUT_VERSION
    const savedOrder: string[] = !stale && Array.isArray(saved?.order) ? saved.order.filter((k: string) => DEFAULT_ORDER.includes(k)) : []
    const order = [...savedOrder, ...DEFAULT_ORDER.filter(k => !savedOrder.includes(k))]
    const hidden: string[] = Array.isArray(saved?.hidden) ? saved.hidden.filter((k: string) => DEFAULT_ORDER.includes(k)) : []
    setLayout({ order, hidden })
    if (stale) { try { localStorage.setItem('dashboardLayout', JSON.stringify({ v: LAYOUT_VERSION, order, hidden })) } catch {} }
  }, [])

  function persistLayout(next: { order: string[]; hidden: string[] }) {
    setLayout(next)
    try { localStorage.setItem('dashboardLayout', JSON.stringify({ v: LAYOUT_VERSION, ...next })) } catch {}
  }
  function moveWidget(key: string, dir: number) {
    const order = [...layout.order]
    const i = order.indexOf(key), j = i + dir
    if (j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    persistLayout({ ...layout, order })
  }
  function toggleHidden(key: string) {
    const hidden = layout.hidden.includes(key) ? layout.hidden.filter(k => k !== key) : [...layout.hidden, key]
    persistLayout({ ...layout, hidden })
  }
  function resetLayout() { persistLayout({ order: [...DEFAULT_ORDER], hidden: [] }) }

  const { properties, tenants, payments, expenses, leases, maintenance, mortgages, assets, entities, schedules, units } = data
  const occupied = properties.filter(p => p.occupancy_status === 'occupied')
  const vacant = properties.filter(p => p.occupancy_status === 'vacant')
  const thisYear = new Date().getFullYear().toString()
  const currentYear = new Date().getFullYear()
  const paidYTD = payments.filter(p => p.status === 'paid' && p.paid_date?.startsWith(thisYear))
  const latePayments = payments.filter(p => p.status === 'late')
  const duePayments = payments.filter(p => p.status === 'due' || p.status === 'upcoming')
  const totalRentRoll = leases.reduce((s, l) => s + (l.rent_amount || 0), 0)
  const totalExpYTD = expenses.filter(e => e.expense_date?.startsWith(thisYear)).reduce((s, e) => s + (e.amount || 0), 0)
  const totalCollectedYTD = paidYTD.reduce((s, p) => s + (p.amount_paid || 0), 0)
  // portfolio value & equity reflect YOUR share (ownership %); rent/collected/expenses stay full
  const portfolioValue = properties.reduce((s, p) => s + share(p.market_value, p), 0)
  const totalEquity = properties.reduce((s, p) => s + (share(p.market_value, p) - share(p.purchase_price, p)), 0)
  const today = new Date()
  const in90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
  const expiringLeases = leases.filter(l => l.end_date && new Date(l.end_date) <= in90).sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
  const todayStr = today.toISOString().slice(0, 10)
  const in90Str = in90.toISOString().slice(0, 10)
  const expiringWarranties = assets.filter((a: any) => a.warranty_expires && a.warranty_expires >= todayStr && a.warranty_expires <= in90Str).sort((a: any, b: any) => a.warranty_expires.localeCompare(b.warranty_expires))
  const insuranceRenewing = properties.filter((p: any) => p.insurance_expires && p.insurance_expires >= todayStr && p.insurance_expires <= in90Str).sort((a: any, b: any) => a.insurance_expires.localeCompare(b.insurance_expires))
  const taxDueSoon = properties.filter((p: any) => p.tax_due_date && p.tax_due_date >= todayStr && p.tax_due_date <= in90Str).sort((a: any, b: any) => a.tax_due_date.localeCompare(b.tax_due_date))
  const complianceDue = entities.map((e: any) => ({ e, due: nextAnnualReportDue(e) })).filter((x: any) => x.due && x.due >= todayStr && x.due <= in90Str).sort((a: any, b: any) => a.due.localeCompare(b.due))
  const in30Str = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10)
  const preventiveDue = schedules.filter((s: any) => s.next_due && s.next_due <= in30Str).sort((a: any, b: any) => a.next_due.localeCompare(b.next_due))
  const recentPayments = payments.filter(p => p.status === 'paid').slice(0, 5)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const collectedThisMonth = payments.filter(p => p.status === 'paid' && p.paid_date?.startsWith(thisMonth)).reduce((s, p) => s + (p.amount_paid || 0), 0)
  const expectedThisMonth = totalRentRoll
  const collectionPct = expectedThisMonth > 0 ? Math.min(100, Math.round((collectedThisMonth / expectedThisMonth) * 100)) : 0
  const pctColor = collectionPct >= 100 ? 'var(--green)' : collectionPct >= 50 ? 'var(--amber)' : 'var(--red)'
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const curMonthIdx = new Date().getMonth()
  const chartData = monthNames.map((month, i) => {
    const monthStr = String(i + 1).padStart(2, '0')
    const monthPayments = payments.filter(p => p.paid_date?.startsWith(thisYear + '-' + monthStr))
    const collected = monthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount_paid || 0), 0)
    return { month, collected, due: i <= curMonthIdx ? totalRentRoll : 0 }
  })

  const returns = computeReturns({ properties, leases, expenses, mortgages, year: currentYear })
  const attentionCount = latePayments.length + expiringLeases.length + maintenance.length + vacant.length + expiringWarranties.length + insuranceRenewing.length + taxDueSoon.length + complianceDue.length + preventiveDue.length

  // Per-tenant rent status for THIS month — who's paid vs who still owes (actionable).
  const leaseRentByTenant: Record<string, number> = {}
  leases.forEach(l => { if (l.tenant_id) leaseRentByTenant[l.tenant_id] = (leaseRentByTenant[l.tenant_id] || 0) + (l.rent_amount || 0) })
  const rentByProperty: Record<string, number> = {}
  leases.forEach(l => { if (l.property_id) rentByProperty[l.property_id] = (rentByProperty[l.property_id] || 0) + (l.rent_amount || 0) })
  // rent vs market: under-rented occupied units (actual lease rent below the unit's target)
  const leaseRentByUnit: Record<string, number> = {}
  leases.forEach((l: any) => { if (l.unit_id) leaseRentByUnit[l.unit_id] = (leaseRentByUnit[l.unit_id] || 0) + (l.rent_amount || 0) })
  const propAddr: Record<string, string> = Object.fromEntries(properties.map((p: any) => [p.id, p.address]))
  const rentGaps = units.map((u: any) => { const cur = leaseRentByUnit[u.id] || 0; const target = u.market_rent || 0; return { ...u, cur, target, gap: target - cur } })
    .filter((u: any) => u.target > 0 && u.cur > 0 && u.gap > 0).sort((a: any, b: any) => b.gap - a.gap)
  const rentGapTotal = rentGaps.reduce((s: number, u: any) => s + u.gap, 0)
  // 💡 top "moves to consider" across all properties (advisor nudges)
  const unitMarketByProp: Record<string, number> = {}
  units.forEach((u: any) => { if (u.property_id) unitMarketByProp[u.property_id] = (unitMarketByProp[u.property_id] || 0) + (u.market_rent || 0) })
  const piByProp: Record<string, number> = {}
  mortgages.forEach((m: any) => { if (m.property_id && !m.is_paid_off) piByProp[m.property_id] = (piByProp[m.property_id] || 0) + monthlyPI(m) * 12 })
  const balByProp2: Record<string, number> = {}
  mortgages.forEach((m: any) => { if (m.property_id && !m.is_paid_off) balByProp2[m.property_id] = (balByProp2[m.property_id] || 0) + (m.current_balance || 0) })
  const moveGroups = properties.map((p: any) => ({
    id: p.id, address: p.address,
    list: propertyMoves({
      id: p.id, address: p.address, value: p.market_value || p.purchase_price || 0, balance: balByProp2[p.id] || 0,
      monthlyRent: rentByProperty[p.id] || 0, unitMarketRent: unitMarketByProp[p.id] || 0,
      annualTax: p.annual_tax || 0, insurance: p.insurance_premium || 0, annualPI: piByProp[p.id] || 0,
    }),
  })).filter((g: any) => g.list.length > 0).slice(0, 6)
  // group properties by owning entity (for the vision-board roster) — only group when 2+ entities are in use
  const propGroups: [string, any[]][] = (() => {
    const g: Record<string, any[]> = {}
    properties.forEach((p: any) => { const k = p.owner_entity || 'Unassigned / Self'; (g[k] = g[k] || []).push(p) })
    return Object.entries(g)
  })()
  const groupByEntity = propGroups.length > 1

  // 📅 This Month — dated events in the current month (forward-looking)
  const monthAbbr = monthNames[curMonthIdx]
  const monthEvents: any[] = []
  leases.forEach((l: any) => { if (l.end_date?.startsWith(thisMonth)) monthEvents.push({ date: l.end_date, icon: '📋', label: 'Lease ends — ' + (l.tenants?.full_name || l.properties?.address || ''), href: '/leases/' + l.id, color: 'var(--amber)' }) })
  properties.forEach((p: any) => {
    if (p.insurance_expires?.startsWith(thisMonth)) monthEvents.push({ date: p.insurance_expires, icon: '🛡', label: 'Insurance renews — ' + p.address, href: '/properties/' + p.id, color: 'var(--blue)' })
    if (p.tax_due_date?.startsWith(thisMonth)) monthEvents.push({ date: p.tax_due_date, icon: '🧾', label: 'Property tax due — ' + p.address, href: '/properties/' + p.id, color: 'var(--red)' })
  })
  maintenance.forEach((m: any) => { if (m.scheduled_date?.startsWith(thisMonth)) monthEvents.push({ date: m.scheduled_date, icon: '🔧', label: (m.title || 'Maintenance') + ' — ' + (m.properties?.address || ''), href: '/maintenance/' + m.id, color: 'var(--blue)' }) })
  mortgages.forEach((m: any) => { if (m.due_day) monthEvents.push({ date: thisMonth + '-' + String(m.due_day).padStart(2, '0'), icon: '🏦', label: 'Loan payment — ' + (m.properties?.address || ''), href: '/mortgage', color: 'var(--text2)' }) })
  assets.forEach((a: any) => { if (a.warranty_expires?.startsWith(thisMonth)) monthEvents.push({ date: a.warranty_expires, icon: '🧰', label: 'Warranty ends — ' + a.name + (a.properties?.address ? ' (' + a.properties.address + ')' : ''), href: '/properties/' + a.property_id + '?tab=appliances', color: 'var(--amber)' }) })
  entities.forEach((e: any) => { const due = nextAnnualReportDue(e); if (due?.startsWith(thisMonth)) monthEvents.push({ date: due, icon: '🏛️', label: 'Annual report — ' + e.name, href: '/entities', color: 'var(--red)' }) })
  monthEvents.sort((a, b) => a.date.localeCompare(b.date))
  const statusOrder: Record<string, number> = { late: 0, due: 1, partial: 1, none: 2, paid: 3 }
  const stChip: Record<string, { c: string; l: string }> = { paid: { c: 'chip-g', l: 'Paid' }, late: { c: 'chip-r', l: 'Late' }, due: { c: 'chip-a', l: 'Due' }, partial: { c: 'chip-a', l: 'Partial' }, none: { c: 'chip-x', l: 'Not charged' } }
  const rentStatus = tenants.map((t: any) => {
    const tp = payments.filter((p: any) => p.tenant_id === t.id && (p.due_date?.startsWith(thisMonth) || p.paid_date?.startsWith(thisMonth)))
    let status = 'none', amount = leaseRentByTenant[t.id] || 0, paid = 0
    if (tp.some((p: any) => p.status === 'paid')) { status = 'paid'; paid = tp.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + (p.amount_paid || 0), 0) }
    else if (tp.some((p: any) => p.status === 'late')) { status = 'late'; amount = tp.find((p: any) => p.status === 'late')?.amount_due || amount }
    else if (tp.some((p: any) => p.status === 'partial')) { status = 'partial'; amount = tp.find((p: any) => p.status === 'partial')?.amount_due || amount }
    else if (tp.some((p: any) => p.status === 'due' || p.status === 'upcoming')) { status = 'due'; amount = tp.find((p: any) => p.status === 'due' || p.status === 'upcoming')?.amount_due || amount }
    return { id: t.id, name: t.full_name, where: t.unit_address || t.properties?.address, status, amount, paid }
  }).sort((a: any, b: any) => statusOrder[a.status] - statusOrder[b.status])
  const paidCount = rentStatus.filter((s: any) => s.status === 'paid').length

  const secLabel: any = { fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }
  const panel: any = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
  const Tile = ({ label, value, sub, color, href, tip }: any) => {
    const inner = (
      <div title={tip || undefined} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%', position: 'relative', cursor: tip && !href ? 'help' : undefined }} className={href ? 'tile-link' : ''}>
        <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}{tip && <span style={{ color: 'var(--text3)', fontWeight: 400 }}> ⓘ</span>}{href && <span style={{ float: 'right', color: 'var(--text3)', fontWeight: 400 }}>›</span>}</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color, marginTop: '5px' }}>{value}</div>
        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{sub}</div>
      </div>
    )
    return href ? <a href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</a> : inner
  }
  const AlertCard = ({ href, color, title, sub }: any) => (
    <a href={href} style={{ textDecoration: 'none' }}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + color, borderRadius: '8px', padding: '10px 14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: '11px', color, marginTop: '2px', textTransform: 'capitalize' }}>{sub}</div>
      </div>
    </a>
  )
  const PropRow = ({ p }: any) => {
    const pts = tenants.filter((t: any) => t.property_id === p.id)
    return (
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + (p.occupancy_status === 'occupied' ? 'var(--green)' : 'var(--amber)'), borderRadius: '8px', padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <a href={'/properties/' + p.id} style={{ textDecoration: 'none', minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{p.address}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'capitalize' }}>{p.city} · {p.type?.replace(/_/g, ' ')} · {p.bedrooms}bd/{p.bathrooms}ba</div>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>{fm(rentByProperty[p.id] || 0)}<span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text3)' }}>/mo</span></div>
              <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{fm((rentByProperty[p.id] || 0) * 12)}/yr</div>
            </div>
            <span className={'chip ' + (p.occupancy_status === 'occupied' ? 'chip-g' : 'chip-a')} style={{ textTransform: 'capitalize' }}>{p.occupancy_status}</span>
          </div>
        </div>
        {pts.length > 0 && (
          <div style={{ marginTop: '8px', borderTop: '0.5px solid var(--border)', paddingTop: '8px', display: 'grid', gap: '6px' }}>
            {pts.map((t: any) => (
              <a key={t.id} href={'/tenants/' + t.id} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>👤 {t.full_name}{t.unit_address ? ' · ' + t.unit_address : ''}</span>
                <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600, flexShrink: 0 }}>{leaseRentByTenant[t.id] ? fm(leaseRentByTenant[t.id]) + '/mo' : ''}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Each dashboard section as a keyed widget (so the user can reorder / hide them).
  const widgets: { [k: string]: any } = {
    portfolio: (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={secLabel}>📈 Portfolio</div>
          <a href='/reports?tab=returns' style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>Full returns →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Portfolio Value', value: fm(portfolioValue), sub: 'Equity: ' + fm(totalEquity), color: 'var(--text)', href: '/properties', tip: 'Total market value of all your properties (your ownership share). Equity = value − loans.' },
            { label: 'Mortgage Debt', value: fm(returns.totals.balance), sub: fm(returns.totals.debt) + '/yr P&I', color: 'var(--red)', href: '/mortgage', tip: 'Total you still owe across all loans. The /yr figure is annual principal & interest.' },
            { label: 'Annual NOI', value: fm(returns.totals.noi), sub: 'rent − expenses', color: 'var(--green)', href: '/reports?tab=returns', tip: 'Net Operating Income — a year of rent minus operating expenses, before the mortgage. The engine of value.' },
            { label: 'Cap Rate', value: returns.totals.cap.toFixed(2) + '%', sub: 'NOI ÷ value', color: 'var(--text)', href: '/reports?tab=returns', tip: 'NOI ÷ value — the all-cash yield. Compare deals; higher = more income per dollar of value.' },
            { label: 'Cash Flow', value: fm(returns.totals.cashFlow), sub: 'NOI − debt service', color: returns.totals.cashFlow >= 0 ? 'var(--green)' : 'var(--red)', href: '/reports?tab=returns', tip: "What's left after the mortgage — your spendable return (before vacancy/repair reserves)." },
            { label: 'DSCR', value: returns.totals.dscr != null ? returns.totals.dscr.toFixed(2) + 'x' : '—', sub: 'NOI ÷ debt', color: 'var(--text)', href: '/reports?tab=returns', tip: 'Income ÷ debt payment. 1.0 covers itself; lenders like ≥1.25. Higher = safer.' },
          ].map(mc => <Tile key={mc.label} {...mc} />)}
        </div>
      </>
    ),
    goals: <GoalsCard current={{ cashFlow: returns.totals.cashFlow / 12, value: portfolioValue, properties: properties.length, occupancy: properties.length ? (occupied.length / properties.length) * 100 : 0 }} />,
    operations: (
      <>
        <div style={secLabel}>🏠 Operations</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Properties', value: properties.length, sub: occupied.length + ' occupied · ' + vacant.length + ' vacant', color: 'var(--text)', href: '/properties' },
            { label: 'Monthly Rent Roll', value: fm(totalRentRoll), sub: leases.length + ' active leases', color: 'var(--green)', href: '/reports?tab=rentroll' },
            { label: 'Collected YTD', value: fm(totalCollectedYTD), sub: paidYTD.length + ' payments', color: 'var(--green)', href: '/payments' },
            { label: 'Expenses YTD', value: fm(totalExpYTD), sub: 'Net: ' + fm(totalCollectedYTD - totalExpYTD), color: 'var(--amber)', href: '/expenses' },
            { label: 'Late Payments', value: latePayments.length, sub: duePayments.length + ' upcoming', color: latePayments.length > 0 ? 'var(--red)' : 'var(--green)', href: '/payments' },
          ].map(mc => <Tile key={mc.label} {...mc} />)}
        </div>
      </>
    ),
    attention: (
      <>
        <div style={secLabel}>⚠️ Needs Attention</div>
        {attentionCount === 0 ? (
          <div style={{ ...panel, padding: '16px', textAlign: 'center', color: 'var(--green)', fontSize: '13px', marginBottom: '20px' }}>✅ All caught up — nothing needs your attention.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: '8px', marginBottom: '20px' }}>
            {latePayments.map(p => <AlertCard key={'p' + p.id} href='/payments' color='var(--red)' title={'Late Rent — ' + (p.tenants?.full_name || 'Tenant')} sub={'Due ' + formatDate(p.due_date) + ' · ' + fm(p.amount_due)} />)}
            {maintenance.map(m => <AlertCard key={'m' + m.id} href={'/maintenance/' + m.id} color={m.priority === 'emergency' ? 'var(--red)' : m.priority === 'high' ? 'var(--amber)' : 'var(--blue)'} title={'🔧 ' + m.title} sub={(m.priority || 'open') + ' · ' + (m.properties?.address || '')} />)}
            {expiringLeases.map(l => <AlertCard key={'l' + l.id} href={'/leases/' + l.id} color='var(--amber)' title={'Lease Expiring — ' + (l.tenants?.full_name || 'Tenant')} sub={'Expires ' + formatDate(l.end_date) + ' · ' + (l.properties?.address || '')} />)}
            {vacant.map(p => <AlertCard key={'v' + p.id} href={'/properties/' + p.id} color='var(--amber)' title={'Vacant — ' + p.address} sub={(p.city || '') + ' · needs a tenant'} />)}
            {expiringWarranties.map((a: any) => <AlertCard key={'w' + a.id} href={'/properties/' + a.property_id + '?tab=appliances'} color='var(--amber)' title={'🧰 Warranty Expiring — ' + a.name} sub={'Expires ' + formatDate(a.warranty_expires) + ' · ' + (a.properties?.address || '')} />)}
            {insuranceRenewing.map((p: any) => <AlertCard key={'ins' + p.id} href={'/properties/' + p.id + '?tab=insurance'} color='var(--amber)' title={'🛡 Insurance Renewing — ' + p.address} sub={'Expires ' + formatDate(p.insurance_expires) + (p.insurance_company ? ' · ' + p.insurance_company : '')} />)}
            {taxDueSoon.map((p: any) => <AlertCard key={'tax' + p.id} href={'/properties/' + p.id + '?tab=insurance'} color='var(--amber)' title={'🧾 Property Tax Due — ' + p.address} sub={'Due ' + formatDate(p.tax_due_date)} />)}
            {complianceDue.map(({ e, due }: any) => <AlertCard key={'cmp' + e.id} href='/entities' color='var(--amber)' title={'🏛️ Annual Report Due — ' + e.name} sub={'File by ' + formatDate(due)} />)}
                {preventiveDue.map((s: any) => <AlertCard key={'pm' + s.id} href='/preventive' color={s.next_due < todayStr ? 'var(--red)' : 'var(--amber)'} title={'🔁 ' + s.title} sub={(s.properties?.address || 'All properties') + ' · due ' + formatDate(s.next_due)} />)}
          </div>
        )}
      </>
    ),
    rentGaps: (
      <>
        <div style={secLabel}>💸 Rent vs Market</div>
        {rentGaps.length === 0 ? (
          <div style={{ ...panel, padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px', marginBottom: '20px' }}>Every leased unit is at or above its target rent. 👍</div>
        ) : (
          <div style={{ ...panel, marginBottom: '20px' }}>
            <div style={{ padding: '9px 14px', borderBottom: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text3)', fontWeight: 600 }}>{rentGaps.length} unit{rentGaps.length > 1 ? 's' : ''} under target · <span style={{ color: 'var(--amber)' }}>{fm(rentGapTotal)}/mo · {fm(rentGapTotal * 12)}/yr</span> opportunity</div>
            {rentGaps.map((u: any) => (
              <a key={u.id} href={'/properties/' + u.property_id + '?tab=units'} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{propAddr[u.property_id] || ''} · now {fm(u.cur)} / target {fm(u.target)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>+{fm(u.gap)}/mo</div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{fm(u.gap * 12)}/yr</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </>
    ),
    moves: (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={secLabel}>💡 Moves to Consider</div>
          <a href='/analyze' style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>Deal Analyzer →</a>
        </div>
        {moveGroups.length === 0 ? (
          <div style={{ ...panel, padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px', marginBottom: '20px' }}>No standout moves right now — your portfolio looks balanced. 👍</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '10px', marginBottom: '20px' }}>
            {moveGroups.map((g: any) => (
              <div key={g.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderLeft: '3px solid var(--green)', borderRadius: '8px', padding: '11px 14px' }}>
                <a href={'/properties/' + g.id} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>🏠 {g.address}</a>
                <div style={{ display: 'grid', gap: '7px', marginTop: '8px' }}>
                  {g.list.map((m: any, i: number) => (
                    <a key={i} href={m.href} style={{ textDecoration: 'none', display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '15px', flexShrink: 0 }}>{m.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{m.label}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}> — {m.why}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    ),
    thisMonth: (
      <>
        <div style={secLabel}>📅 This Month · {monthLabel}</div>
        {monthEvents.length === 0 ? (
          <div style={{ ...panel, padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px', marginBottom: '20px' }}>Nothing scheduled this month.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: '8px', marginBottom: '20px' }}>
            {monthEvents.map((e: any, i: number) => (
              <a key={i} href={e.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '0.5px solid var(--border)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: e.color, lineHeight: 1 }}>{Number(e.date.slice(8, 10))}</div>
                    <div style={{ fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase', marginTop: '1px' }}>{monthAbbr}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.icon} {e.label}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </>
    ),
    rentCollection: (
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px 22px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <a href='/payments' style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>💰 Rent Collection · {monthLabel} <span style={{ color: 'var(--text3)' }}>›</span></div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '30px', fontWeight: 800, color: 'var(--text)', marginTop: '6px' }}>{fm(collectedThisMonth)} <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text3)' }}>/ {fm(expectedThisMonth)} expected this month</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, color: pctColor }}>{collectionPct}%</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{fm(Math.max(0, expectedThisMonth - collectedThisMonth))} outstanding</div>
          </div>
        </a>
        <div style={{ marginTop: '14px', height: '8px', background: 'var(--bg3)', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ width: collectionPct + '%', height: '100%', background: pctColor, borderRadius: '20px', transition: 'width 0.4s' }} />
        </div>
        <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '18px', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{currentYear} Monthly Trend</div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text3)' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--green)', display: 'inline-block' }} />Collected</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text3)' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--border2)', display: 'inline-block' }} />Rent Roll</span>
            </div>
          </div>
          <ResponsiveContainer width='100%' height={170}>
            <BarChart data={chartData} barGap={4} barCategoryGap='30%'>
              <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='3 3' />
              <XAxis dataKey='month' tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v} width={40} />
              <Tooltip contentStyle={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey='due' fill='var(--border2)' radius={[3,3,0,0]} />
              <Bar dataKey='collected' fill='var(--green)' radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
    rentStatus: (
      <div style={{ marginBottom: '14px' }}>
        <div style={secLabel}>🧾 Rent Status · {monthLabel}</div>
        <div style={panel}>
          <div style={{ padding: '9px 14px', borderBottom: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text3)', fontWeight: 600 }}>{paidCount} of {rentStatus.length} paid this month{rentStatus.length - paidCount > 0 ? ' · ' + (rentStatus.length - paidCount) + ' to collect' : ''}</div>
          {rentStatus.length === 0 ? <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text3)' }}>No active tenants.</div> : rentStatus.map((s: any) => {
            const ch = stChip[s.status]
            const href = s.status === 'paid' ? '/tenants/' + s.id : '/payments?tenant_id=' + s.id
            return (
              <a key={s.id} href={href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.where}{s.status !== 'paid' && s.status !== 'none' ? ' · tap to record' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: s.status === 'paid' ? 'var(--green)' : 'var(--text2)' }}>{s.status === 'paid' ? fm(s.paid) : fm(s.amount)}</div>
                    <span className={'chip ' + ch.c}>{ch.l}</span>
                  </div>
                </div>
              </a>
            )
          })}
          <a href='/payments' style={{ display: 'block', padding: '10px 14px', fontSize: '12px', color: 'var(--green)', textDecoration: 'none' }}>View all payments →</a>
        </div>
      </div>
    ),
    quickActions: (
      <div style={{ marginBottom: '14px' }}>
        <div style={secLabel}>⚡ Quick Actions</div>
        <div style={panel}>
          {[
            { href: '/payments', icon: '💳', label: 'Record Payment', sub: duePayments.length + ' payments due' },
            { href: '/tenants/new', icon: '👤', label: 'Add Tenant', sub: vacant.length + ' vacant' },
            { href: '/maintenance/new', icon: '🔧', label: 'New Maintenance Request', sub: maintenance.length + ' open' },
            { href: '/expenses/new', icon: '💰', label: 'Add Expense', sub: 'Track property costs' },
            { href: '/leases/new', icon: '📋', label: 'Create Lease', sub: 'Draft a new lease' },
            { href: '/reports?tab=returns', icon: '📊', label: 'Returns & Reports', sub: 'Cap rate, DSCR, cash flow' },
          ].map((item, i) => (
            <a key={i} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{item.sub}</div>
                </div>
                <span style={{ color: 'var(--text3)', fontSize: '12px' }}>→</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    ),
    propertiesTenants: (
      <>
        <div style={secLabel}>🏠 Properties & Tenants</div>
        {properties.length === 0 ? (
          <div style={{ ...panel, padding: '20px', fontSize: '13px', color: 'var(--text3)' }}>No properties yet.</div>
        ) : groupByEntity ? (
          propGroups.map(([name, props]) => {
            const grpRent = props.reduce((s: number, p: any) => s + (rentByProperty[p.id] || 0), 0)
            return (
              <div key={name} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '0 2px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>🏛️ {name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{props.length} propert{props.length === 1 ? 'y' : 'ies'} · {fm(grpRent)}/mo</div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>{props.map((p: any) => <PropRow key={p.id} p={p} />)}</div>
              </div>
            )
          })
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>{properties.map((p: any) => <PropRow key={p.id} p={p} />)}</div>
        )}
      </>
    ),
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Dashboard</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setEditMode(e => !e)} className='btn btn-ghost'>{editMode ? '✓ Done' : '⚙ Customize'}</button>
          <a href='/properties/new' className='btn btn-ghost'>+ Property</a>
          <a href='/tenants/new' className='btn btn-primary'>+ Tenant</a>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px' }}>{[0,1,2,3,4,5].map(i => <div key={i} className='skeleton' style={{ height: '78px' }} />)}</div>
            <div className='skeleton' style={{ height: '96px' }} />
            <div className='skeleton' style={{ height: '220px' }} />
          </div>
        ) : (
          <>
            <GettingStarted />

            {editMode && (
              <div style={{ background: 'var(--bg3)', border: '0.5px dashed var(--border2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>⚙ Customize mode — use ▲▼ to reorder and Hide/Show to toggle sections. Saved to this browser.</div>
                <button onClick={resetLayout} className='btn btn-ghost' style={{ fontSize: '11px' }}>Reset to default</button>
              </div>
            )}
            {layout.order.map(key => {
              const isHidden = layout.hidden.includes(key)
              if (!editMode && isHidden) return null
              if (!editMode) return <div key={key}>{widgets[key]}</div>
              return (
                <div key={key} style={{ border: '0.5px dashed var(--border2)', borderRadius: '10px', padding: '8px', marginBottom: '10px', background: 'var(--bg2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', flex: 1 }}>{WIDGET_LABELS[key]}{isHidden && <span style={{ color: 'var(--text3)', fontWeight: 400 }}> · hidden</span>}</span>
                    <button onClick={() => moveWidget(key, -1)} className='btn btn-ghost' style={{ padding: '3px 9px', fontSize: '12px' }}>▲</button>
                    <button onClick={() => moveWidget(key, 1)} className='btn btn-ghost' style={{ padding: '3px 9px', fontSize: '12px' }}>▼</button>
                    <button onClick={() => toggleHidden(key)} className='btn btn-ghost' style={{ padding: '3px 12px', fontSize: '11px', color: isHidden ? 'var(--green)' : 'var(--text2)' }}>{isHidden ? 'Show' : 'Hide'}</button>
                  </div>
                  <div style={{ opacity: isHidden ? 0.4 : 1, pointerEvents: 'none' }}>{widgets[key]}</div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </AppShell>
  )
}
