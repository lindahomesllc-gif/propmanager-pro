// app/api/properties/route.ts
// GET /api/properties     → list all properties for logged-in landlord
// POST /api/properties    → create a new property

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ── GET all properties ─────────────────────────────────────────
export async function GET() {
  const supabase = createClient()

  // Get the logged-in user (Supabase handles JWT verification)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch properties with related mortgages and active leases
  // Row-level security ensures user only sees their own properties
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      mortgages (
        id,
        lender,
        original_amount,
        current_balance,
        interest_rate,
        term_years,
        monthly_payment,
        due_day,
        start_date
      ),
      leases (
        id,
        rent_amount,
        deposit_amount,
        start_date,
        end_date,
        status,
        tenants (
          id,
          full_name,
          email,
          phone
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ properties: data })
}

// ── POST create property ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Validate required fields
  if (!body.address || !body.city || !body.state) {
    return NextResponse.json(
      { error: 'Address, city, and state are required' },
      { status: 400 }
    )
  }

  // Insert property
  const { data: property, error } = await supabase
    .from('properties')
    .insert({
      user_id: user.id,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      type: body.type,
      beds: body.beds,
      baths: body.baths,
      sqft: body.sqft,
      year_built: body.year_built,
      purchase_price: body.purchase_price,
      purchase_date: body.purchase_date,
      market_value: body.market_value,
      owner_entity: body.owner_entity,
      occupancy: 'vacant',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating property:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If mortgage data provided, create mortgage record too
  if (body.mortgage && property) {
    await supabase.from('mortgages').insert({
      property_id: property.id,
      lender: body.mortgage.lender,
      original_amount: body.mortgage.original_amount,
      current_balance: body.mortgage.current_balance,
      interest_rate: body.mortgage.interest_rate,
      term_years: body.mortgage.term_years || 30,
      monthly_payment: body.mortgage.monthly_payment,
      due_day: body.mortgage.due_day || 1,
      start_date: body.mortgage.start_date,
    })
  }

  // Update user's property count
  await supabase.rpc('increment_property_count', { user_id: user.id })

  return NextResponse.json({ property }, { status: 201 })
}
