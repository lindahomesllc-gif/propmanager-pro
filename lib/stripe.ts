import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://sugfedlfmvmbcnblhnuc.supabase.co'

// Server-side Stripe client (test or live depending on the key).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

// Service-role Supabase client for server-side DB writes (bypasses RLS).
export const svc = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false },
})

// Verify a Supabase access token from an "Authorization: Bearer <token>" header
// (our app uses localStorage sessions, so API routes get the token explicitly).
export async function getUserFromRequest(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return null
  const anon = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}
