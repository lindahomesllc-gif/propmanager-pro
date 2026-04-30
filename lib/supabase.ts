import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── TYPE DEFINITIONS ──────────────────────────────────────────────────

export type Property = {
  id: string
  user_id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  type: 'single_family' | 'condo' | 'duplex' | 'multi_family' | 'commercial' | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  year_built: number | null
  owner_entity: string | null
  purchase_price: number | null
  purchase_date: string | null
  market_value: number | null
  occupancy_status: 'occupied' | 'vacant'
  photo_urls: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Tenant = {
  id: string
  property_id: string
  user_id: string
  full_name: string
  email: string | null
  phone: string | null
  move_in_date: string | null
  move_out_date: string | null
  status: 'active' | 'past' | 'applicant'
  portal_access: boolean
  notes: string | null
  created_at: string
}

export type Lease = {
  id: string
  property_id: string
  tenant_id: string
  user_id: string
  rent_amount: number
  security_deposit: number | null
  start_date: string
  end_date: string
  due_day: number
  grace_period_days: number
  late_fee_amount: number
  status: 'draft' | 'sent' | 'executed' | 'expired' | 'terminated'
  landlord_signed_at: string | null
  tenant_signed_at: string | null
  created_at: string
}

export type Payment = {
  id: string
  lease_id: string
  tenant_id: string
  property_id: string
  user_id: string
  amount_due: number
  amount_paid: number
  due_date: string
  paid_date: string | null
  payment_method: string | null
  status: 'upcoming' | 'due' | 'paid' | 'partial' | 'late' | 'waived'
  stripe_payment_intent_id: string | null
  notes: string | null
  created_at: string
}

export type Expense = {
  id: string
  property_id: string
  user_id: string
  amount: number
  expense_date: string
  category: string
  description: string | null
  vendor_name: string | null
  receipt_url: string | null
  is_deductible: boolean
  created_at: string
}

export type Mortgage = {
  id: string
  property_id: string
  user_id: string
  lender_name: string | null
  original_amount: number
  current_balance: number
  interest_rate: number
  term_years: number
  monthly_payment: number
  start_date: string
  due_day: number
  is_paid_off: boolean
  created_at: string
}

export type Message = {
  id: string
  user_id: string
  tenant_id: string
  property_id: string
  sender: 'landlord' | 'tenant'
  body: string
  read_at: string | null
  created_at: string
}

export type Vendor = {
  id: string
  user_id: string
  name: string
  company_name: string | null
  trade: string | null
  phone: string | null
  email: string | null
  rating: number | null
  preferred: boolean
  notes: string | null
}

// ── DATABASE HELPERS ──────────────────────────────────────────────────

export async function getProperties(userId: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('getProperties error:', error); return [] }
  return data || []
}

export async function getTenants(userId: string): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  if (error) { console.error('getTenants error:', error); return [] }
  return data || []
}

export async function getLeases(userId: string): Promise<Lease[]> {
  const { data, error } = await supabase
    .from('leases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('getLeases error:', error); return [] }
  return data || []
}

export async function getPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: false })
  if (error) { console.error('getPayments error:', error); return [] }
  return data || []
}

export async function getExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
  if (error) { console.error('getExpenses error:', error); return [] }
  return data || []
}

export async function getMortgages(userId: string): Promise<Mortgage[]> {
  const { data, error } = await supabase
    .from('mortgages')
    .select('*')
    .eq('user_id', userId)
  if (error) { console.error('getMortgages error:', error); return [] }
  return data || []
}

export async function getMessages(userId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('getMessages error:', error); return [] }
  return data || []
}

export async function addProperty(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property | null> {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single()
  if (error) { console.error('addProperty error:', error); return null }
  return data
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<boolean> {
  const { error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
  if (error) { console.error('updateProperty error:', error); return false }
  return true
}

export async function addPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()
  if (error) { console.error('addPayment error:', error); return null }
  return data
}

export async function markPaymentPaid(id: string, method: string): Promise<boolean> {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      amount_paid: supabase.rpc as any,
      paid_date: new Date().toISOString().split('T')[0],
      payment_method: method,
    })
    .eq('id', id)
  if (error) { console.error('markPaymentPaid error:', error); return false }
  return true
}

export async function sendMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()
  if (error) { console.error('sendMessage error:', error); return null }
  return data
}

export const fm = (n: number | null | undefined): string =>
  '$' + Math.abs(Math.round(n || 0)).toLocaleString()

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const daysUntil = (dateStr: string | null): number => {
  if (!dateStr) return 999
  const d = new Date(dateStr)
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
