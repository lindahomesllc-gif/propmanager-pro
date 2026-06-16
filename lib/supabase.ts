import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sugfedlfmvmbcnblhnuc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1Z2ZlZGxmbXZtYmNuYmxobnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzAxNDMsImV4cCI6MjA5MzE0NjE0M30.H5XZES1K9abTV2QVYYi0NG6SfGFSJEq-lfmKiva8ihw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const USER_ID = 'cacb3a74-75d7-4e07-af71-6db4fdde9a92'

export type Property = {
  id: string; user_id: string; address: string; city: string | null
  state: string | null; zip: string | null; type: string | null
  bedrooms: number | null; bathrooms: number | null; sqft: number | null
  owner_entity: string | null; entity_id: string | null; ownership_percentage: number | null
  purchase_price: number | null
  market_value: number | null; occupancy_status: string; created_at: string; updated_at: string
}
export type Tenant = {
  id: string; property_id: string; user_id: string; full_name: string
  email: string | null; phone: string | null; move_in_date: string | null
  status: string; portal_access: boolean; created_at: string
}
export type Payment = {
  id: string; lease_id: string; tenant_id: string; property_id: string
  user_id: string; amount_due: number; amount_paid: number; due_date: string
  paid_date: string | null; payment_method: string | null; status: string; created_at: string
}
export type Message = {
  id: string; user_id: string; tenant_id: string; property_id: string
  sender: string; body: string; read_at: string | null; created_at: string
}
export async function getProperties() {
  const { data, error } = await supabase.from('properties').select('*').order('created_at')
  if (error) { console.error(error); return [] }
  return data || []
}
export async function getTenants() {
  const { data, error } = await supabase.from('tenants').select('*').order('created_at')
  if (error) { console.error(error); return [] }
  return data || []
}
export async function getPayments() {
  const { data, error } = await supabase.from('payments').select('*').order('due_date', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}
export async function getMessages() {
  const { data, error } = await supabase.from('messages').select('*').order('created_at')
  if (error) { console.error(error); return [] }
  return data || []
}
export async function sendMessage(message: Omit<Message, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('messages').insert(message).select().single()
  if (error) { console.error(error); return null }
  return data
}
export async function markPaymentPaid(id: string, method: string, amount: number) {
  const { error } = await supabase.from('payments').update({ status: 'paid', amount_paid: amount, paid_date: new Date().toISOString().split('T')[0], payment_method: method }).eq('id', id)
  return !error
}
// Fractional ownership: the fraction (0–1) of a property you own. Unset = 100%.
export const ownPct = (p: { ownership_percentage?: number | null } | null | undefined) =>
  p && p.ownership_percentage != null ? p.ownership_percentage / 100 : 1
// "Your share" of an amount, scaled by the property's ownership percentage.
export const share = (n: number | null | undefined, p: { ownership_percentage?: number | null } | null | undefined) =>
  (n || 0) * ownPct(p)
export const fm = (n: number | null | undefined) => { const v = Math.round(n || 0); return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString() }
export const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
// Loan types — single source of truth for the dropdown + display labels.
// (Stored value, display label.) Keep in sync with the DB check constraint.
export const LOAN_TYPES: [string, string][] = [
  ['conventional', 'Conventional'], ['dscr', 'DSCR'], ['fha', 'FHA'], ['va', 'VA'],
  ['usda', 'USDA'], ['jumbo', 'Jumbo'], ['interest_only', 'Interest-Only'],
  ['hard_money', 'Hard Money'], ['seller_financed', 'Seller-Financed'],
  ['construction', 'Construction'], ['commercial', 'Commercial'], ['heloc', 'HELOC'],
  ['private_lender', 'Private Lender'], ['bridge', 'Bridge'], ['portfolio', 'Portfolio'], ['blanket', 'Blanket'],
]
// Next annual-report / compliance due date for an entity (YYYY-MM-DD), or null.
// Florida LLCs must file their annual report by May 1 each year; an explicit
// annual_report_due overrides the state default.
export function nextAnnualReportDue(e: { formation_state?: any; annual_report_due?: any }): string | null {
  if (e?.annual_report_due) return e.annual_report_due
  const st = (e?.formation_state || '').toString().trim().toUpperCase()
  if (st === 'FL' || st === 'FLORIDA') {
    const now = new Date()
    const y = now.getFullYear()
    const may1 = y + '-05-01'
    return now.toISOString().slice(0, 10) <= may1 ? may1 : (y + 1) + '-05-01'
  }
  return null
}

// Monthly principal & interest for a loan (escrow-free) from amount / rate / term.
// Used by the amortization schedule and the investor-returns metrics.
export const monthlyPI = (m: { original_amount?: any; interest_rate?: any; term_years?: any; interest_only?: any; current_balance?: any }) => {
  const r = (Number(m.interest_rate) || 0) / 100 / 12
  // Interest-only loans never amortize — the payment is just interest on the
  // outstanding balance; principal stays put until the balloon/maturity.
  if (m.interest_only) {
    // IO loans don't amortize — interest is on the full loan amount (which is also the
    // balance until the balloon). Prefer original_amount so cash flow/DSCR match the
    // amortization schedule even if current_balance was left at a partial draw.
    const bal = Number(m.original_amount) || Number(m.current_balance) || 0
    return bal > 0 ? bal * r : 0
  }
  const P = Number(m.original_amount) || 0
  const n = Math.round((Number(m.term_years) || 0) * 12)
  if (P <= 0 || n <= 0) return 0
  return r > 0 ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n
}
// Single source of truth for investor returns — used by Reports AND the Dashboard.
// NOI = annualized in-place rent (active leases ×12) − that year's expenses.
// Debt service = P&I only (escrow excluded). Returns per-property metrics,
// portfolio totals, and a by-entity rollup.
export function computeReturns(opts: { properties: any[]; leases: any[]; expenses: any[]; mortgages: any[]; entities?: any[]; year: number }) {
  const { properties, leases, expenses, mortgages, entities = [], year } = opts
  const yearStr = String(year)
  const rentByProp: Record<string, number> = {}
  leases.forEach((l: any) => { if (l.property_id) rentByProp[l.property_id] = (rentByProp[l.property_id] || 0) + (l.rent_amount || 0) * 12 })
  const expByProp: Record<string, number> = {}
  expenses.filter((e: any) => e.expense_date?.startsWith(yearStr)).forEach((e: any) => { if (e.property_id) expByProp[e.property_id] = (expByProp[e.property_id] || 0) + (e.amount || 0) })
  const piByProp: Record<string, number> = {}
  const balByProp: Record<string, number> = {}
  mortgages.filter((m: any) => !m.is_paid_off).forEach((m: any) => {
    if (!m.property_id) return
    piByProp[m.property_id] = (piByProp[m.property_id] || 0) + monthlyPI(m) * 12
    balByProp[m.property_id] = (balByProp[m.property_id] || 0) + (m.current_balance || 0)
  })
  const metrics = properties.map((p: any) => {
    const value = p.market_value || p.purchase_price || 0
    const income = rentByProp[p.id] || 0
    const opex = expByProp[p.id] || 0
    const noi = income - opex
    const debt = piByProp[p.id] || 0
    const cashFlow = noi - debt
    const balance = balByProp[p.id] || 0
    const equity = value - balance
    const cashInvested = p.cash_invested || 0
    return {
      id: p.id, address: p.address, entity_id: p.entity_id || null, value, income, opex, noi, debt, cashFlow, balance, equity, cashInvested,
      cap: value > 0 ? noi / value * 100 : null,
      dscr: debt > 0 ? noi / debt : null,
      roe: equity > 0 ? cashFlow / equity * 100 : null,
      roi: cashInvested > 0 ? cashFlow / cashInvested * 100 : null, // cash-on-cash
    }
  }).filter((m: any) => m.value > 0 || m.noi !== 0).sort((a: any, b: any) => b.cashFlow - a.cashFlow)
  const sum = (k: string) => metrics.reduce((s: number, m: any) => s + m[k], 0)
  const tV = sum('value'), tNOI = sum('noi'), tDebt = sum('debt'), tBal = sum('balance'), tCF = sum('cashFlow'), tCI = sum('cashInvested')
  const totals = { value: tV, noi: tNOI, debt: tDebt, balance: tBal, cashFlow: tCF, cashInvested: tCI, cap: tV > 0 ? tNOI / tV * 100 : 0, dscr: tDebt > 0 ? tNOI / tDebt : null, roi: tCI > 0 ? tCF / tCI * 100 : null }
  const entityRows = [...entities, { id: null, name: 'Unassigned / Self' }].map((en: any) => {
    const ms = metrics.filter((m: any) => (m.entity_id || null) === (en.id || null))
    const value = ms.reduce((s: number, m: any) => s + m.value, 0)
    const noi = ms.reduce((s: number, m: any) => s + m.noi, 0)
    const debt = ms.reduce((s: number, m: any) => s + m.debt, 0)
    const cf = ms.reduce((s: number, m: any) => s + m.cashFlow, 0)
    return { name: en.name, count: ms.length, value, noi, debt, cf, cap: value > 0 ? noi / value * 100 : null, dscr: debt > 0 ? noi / debt : null }
  }).filter((r: any) => r.count > 0).sort((a: any, b: any) => b.cf - a.cf)
  return { metrics, totals, entityRows }
}
// Lightweight per-property "what should I do next" moves, using default reserve
// assumptions (29% of rent). Used by the dashboard widget; the Deal Analyzer has
// an interactive version. Caller supplies the property's rent/loan/unit context.
export function propertyMoves(a: { id: string; address: string; value: number; balance: number; monthlyRent: number; unitMarketRent: number; annualTax: number; insurance: number; annualPI: number }) {
  const grossRent = a.monthlyRent * 12
  const reserves = grossRent * 0.29 // vacancy+maint+capex+mgmt defaults
  const trueCF = grossRent - (a.annualTax || 0) - (a.insurance || 0) - reserves - (a.annualPI || 0)
  const equity = a.value - a.balance
  const roe = equity > 0 ? trueCF / equity * 100 : null
  const rentGapMo = a.unitMarketRent > 0 ? a.unitMarketRent - a.monthlyRent : 0
  const moves: { icon: string; label: string; why: string; href: string }[] = []
  if (rentGapMo > 25) moves.push({ icon: '💸', label: 'Raise rent', why: '~' + fm(rentGapMo) + '/mo under market (' + fm(rentGapMo * 12) + '/yr)', href: '/properties/' + a.id + '?tab=units' })
  if (a.balance === 0 && equity > 50000) moves.push({ icon: '🏦', label: 'Tap equity', why: fm(equity) + ' idle — a cash-out could fund the next buy', href: '/modeler' })
  else if (roe != null && roe < 5 && equity > 50000) moves.push({ icon: '🐌', label: 'Lazy equity', why: 'returning only ' + roe.toFixed(0) + '% — refi or 1031 to redeploy', href: '/modeler' })
  if (trueCF < 0) moves.push({ icon: '⚠️', label: 'Thin cash flow', why: fm(trueCF / 12) + '/mo after honest reserves', href: '/analyze' })
  return moves
}

const LOAN_TYPE_MAP: Record<string, string> = Object.fromEntries(LOAN_TYPES)
export const loanTypeLabel = (t: string | null | undefined) => {
  if (!t) return '—'
  return LOAN_TYPE_MAP[t.toLowerCase()] || (t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
}
