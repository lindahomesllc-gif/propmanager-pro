// app/api/properties/[id]/route.ts
// GET    /api/properties/:id  → get single property with all details
// PATCH  /api/properties/:id  → update property
// DELETE /api/properties/:id  → delete property

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ── GET single property with everything ───────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      mortgages (*),
      tenants (*),
      leases (
        *,
        tenants (*)
      ),
      payments (
        *
        order: due_date DESC
        limit: 12
      ),
      expenses (
        *
        order: date DESC
        limit: 24
      ),
      maintenance_requests (
        *
        order: created_at DESC
        limit: 10
      ),
      listings (*)
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)  // RLS also handles this, but explicit is safer
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ property: data })
}

// ── PATCH update property ──────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Only allow updating specific fields (prevents injection)
  const allowedFields = [
    'address', 'city', 'state', 'zip', 'type', 'beds', 'baths',
    'sqft', 'year_built', 'purchase_price', 'purchase_date',
    'market_value', 'owner_entity', 'occupancy', 'notes', 'photos',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ property: data })
}

// ── DELETE property ────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cascade deletes are set up in the schema, so this removes
  // mortgages, tenants, leases, payments, etc. automatically
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Decrement property count
  await supabase.rpc('decrement_property_count', { user_id: user.id })

  return NextResponse.json({ success: true })
}
