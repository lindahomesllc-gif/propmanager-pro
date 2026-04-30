// app/api/payments/create-intent/route.ts
// POST — Creates a Stripe PaymentIntent for rent collection
// Called when tenant clicks "Confirm & Pay"

import { createClient } from '@/lib/supabase/server'
import { createRentPaymentIntent } from '@/lib/stripe/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  // This can be called by tenant (portal) or landlord (manual recording)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { lease_id, method, month } = await request.json()

  if (!lease_id || !month) {
    return NextResponse.json(
      { error: 'lease_id and month are required' },
      { status: 400 }
    )
  }

  // Fetch the lease with property and landlord info
  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .select(`
      *,
      properties (
        id,
        address,
        users (
          stripe_account_id
        )
      ),
      tenants (id, full_name, email)
    `)
    .eq('id', lease_id)
    .single()

  if (leaseError || !lease) {
    return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
  }

  // Check if payment already exists for this month
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('lease_id', lease_id)
    .like('due_date', `${month}%`)
    .single()

  if (existingPayment?.status === 'paid') {
    return NextResponse.json(
      { error: 'Rent already paid for this month' },
      { status: 400 }
    )
  }

  // For digital payments (card/ACH), create Stripe PaymentIntent
  if (method === 'card' || method === 'ach') {
    const landlordStripeAccount = lease.properties?.users?.stripe_account_id

    if (!landlordStripeAccount) {
      return NextResponse.json(
        { error: 'Landlord has not connected their bank account yet. Please ask them to complete Stripe setup.' },
        { status: 400 }
      )
    }

    const amountCents = Math.round(lease.rent_amount * 100)

    const paymentIntent = await createRentPaymentIntent({
      amountCents,
      landlordAccountId: landlordStripeAccount,
      leaseId: lease_id,
      tenantId: lease.tenant_id,
      propertyId: lease.property_id,
      month,
    })

    // Create payment record in DB (status: 'due' until webhook confirms)
    const { data: payment } = await supabase
      .from('payments')
      .upsert({
        lease_id,
        tenant_id: lease.tenant_id,
        property_id: lease.property_id,
        user_id: lease.user_id,
        amount: lease.rent_amount,
        total_amount: lease.rent_amount,
        due_date: `${month}-01`,
        method,
        status: 'due',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single()

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      payment_id: payment?.id,
      amount: lease.rent_amount,
    })
  }

  // For manual payments (cash/check/zelle), record directly as paid
  if (['cash', 'check', 'zelle', 'manual'].includes(method)) {
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .upsert({
        lease_id,
        tenant_id: lease.tenant_id,
        property_id: lease.property_id,
        user_id: lease.user_id,
        amount: lease.rent_amount,
        total_amount: lease.rent_amount,
        due_date: `${month}-01`,
        paid_date: new Date().toISOString(),
        method,
        status: 'paid',
      })
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 })
    }

    return NextResponse.json({ payment, success: true })
  }

  return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
}
