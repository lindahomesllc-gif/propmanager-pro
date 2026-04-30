// app/api/webhooks/stripe/route.ts
// Stripe sends events here when payments succeed, fail, subscriptions change, etc.
// Set this URL in: Stripe Dashboard → Developers → Webhooks → Add endpoint
// URL: https://yourapp.com/api/webhooks/stripe

import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// IMPORTANT: Stripe requires the raw body to verify the signature
export const config = { api: { bodyParser: false } }

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event

  // Verify the event came from Stripe (not a fake request)
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  // Admin client bypasses RLS — needed because webhooks run server-side
  // without a user session
  const supabase = createAdminClient()

  console.log(`Processing Stripe event: ${event.type}`)

  switch (event.type) {

    // ── RENT PAYMENT SUCCEEDED ──────────────────────────────────
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as any
      const { lease_id, tenant_id, property_id, month, type } = paymentIntent.metadata

      if (type === 'rent' && lease_id) {
        // Update payment record to paid
        await supabase
          .from('payments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            stripe_charge_id: paymentIntent.latest_charge,
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        // Fetch tenant and landlord details for receipt email
        const { data: tenant } = await supabase
          .from('tenants')
          .select('full_name, email')
          .eq('id', tenant_id)
          .single()

        const { data: property } = await supabase
          .from('properties')
          .select('address, users(email, full_name)')
          .eq('id', property_id)
          .single()

        // Send receipt email to tenant
        if (tenant?.email) {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: tenant.email,
            subject: `✅ Rent Payment Confirmed — ${month}`,
            html: `
              <h2>Payment Confirmed</h2>
              <p>Hi ${tenant.full_name},</p>
              <p>Your rent payment of <strong>$${(paymentIntent.amount / 100).toFixed(2)}</strong> 
              for ${property?.address} has been successfully processed.</p>
              <p><strong>Month:</strong> ${month}<br/>
              <strong>Confirmation:</strong> ${paymentIntent.id}<br/>
              <strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p>Thank you!</p>
            `,
          })
        }

        // Notify landlord
        const landlordEmail = (property?.users as any)?.email
        if (landlordEmail) {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: landlordEmail,
            subject: `💰 Rent Received — ${property?.address}`,
            html: `
              <h2>Rent Payment Received</h2>
              <p>${tenant?.full_name} paid <strong>$${(paymentIntent.amount / 100).toFixed(2)}</strong> 
              for ${property?.address}.</p>
              <p>Funds will appear in your bank account within 1-2 business days.</p>
            `,
          })
        }
      }

      // Screening fee paid — trigger background check
      if (type === 'screening_fee') {
        const { application_id } = paymentIntent.metadata
        await supabase
          .from('applications')
          .update({ status: 'screening' })
          .eq('id', application_id)

        // In production: call TransUnion API here
        console.log(`Screening fee paid for application ${application_id} — run TransUnion check`)
      }
      break
    }

    // ── PAYMENT FAILED ──────────────────────────────────────────
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as any
      const { lease_id, tenant_id } = paymentIntent.metadata

      if (lease_id) {
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        // Notify tenant of failure
        const { data: tenant } = await supabase
          .from('tenants')
          .select('email, full_name')
          .eq('id', tenant_id)
          .single()

        if (tenant?.email) {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: tenant.email,
            subject: '⚠️ Payment Failed — Action Required',
            html: `
              <h2>Payment Failed</h2>
              <p>Hi ${tenant.full_name}, your rent payment could not be processed.</p>
              <p>Please log into your tenant portal and try again with a different payment method.</p>
              <p>If you need help, contact your landlord directly.</p>
            `,
          })
        }
      }
      break
    }

    // ── SUBSCRIPTION ACTIVATED (landlord upgraded to Pro/Portfolio) ─
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as any
      const plan = subscription.items.data[0]?.price?.id

      // Map Stripe price ID to plan name
      const planMap: Record<string, string> = {
        [process.env.STRIPE_PRO_PRICE_ID!]: 'pro',
        [process.env.STRIPE_PORTFOLIO_PRICE_ID!]: 'portfolio',
      }

      const planName = planMap[plan] || 'pro'

      // Find user by Stripe customer ID and update their plan
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', subscription.customer)
        .single()

      if (user) {
        await supabase
          .from('users')
          .update({
            plan: planName,
            plan_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', user.id)
      }
      break
    }

    // ── SUBSCRIPTION CANCELLED ──────────────────────────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', subscription.customer)
        .single()

      if (user) {
        await supabase
          .from('users')
          .update({ plan: 'starter', plan_expires_at: null })
          .eq('id', user.id)
      }
      break
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`)
  }

  // Always return 200 — otherwise Stripe retries the webhook
  return NextResponse.json({ received: true })
}
