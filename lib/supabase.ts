import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sugfedlfmvmbcnblhnuc.supabase.co'
const supabaseAnonKey = 'sb_publishable_h3XsDU5Y8DgjlGdCYBxezw_Tx17iPL'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const USER_ID = 'cacb3a74-75d7-4e07-af71-6db4fdde9a92'

export type Property = {
  id: string; user_id: string; address: string; city: string | null
  state: string | null; zip: string | null; type: string | null
  bedrooms: number | null; bathrooms: number | null; sqft: number | null
  owner_entity: string | null; purchase_price: number | null
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
  const { data, error } = await supabase.from('properties').select('*').eq('user_id', USER_ID).order('created_at')
  if (error) { console.error(error); return [] }
  return data || []
}
export async function getTenants() {
  const { data, error } = await supabase.from('tenants').select('*').eq('user_id', USER_ID).order('created_at')
  if (error) { console.error(error); return [] }
  return data || []
}
export async function getPayments() {
  const { data, error } = await supabase.from('payments').select('*').eq('user_id', USER_ID).order('due_date', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}
export async function getMessages() {
  const { data, error } = await supabase.from('messages').select('*').eq('user_id', USER_ID).order('created_at')
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
export const fm = (n: number | null | undefined) => '$' + Math.abs(Math.round(n || 0)).toLocaleString()
export const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
