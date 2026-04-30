// lib/stripe/client.ts
import Stripe from 'stripe'

// Server-side Stripe client — never use on the browser
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

// ──────────────────────────────────────────────────────────────
// LANDLORD ONBOARDING: Create Stripe Connect account
// ──────────────────────────────────────────────────────────────
export async function createLandlordStripeAccount(email: string) {
  const account = await stripe.accounts.create({
    type: 'standard',
    email,
    metadata: { platform: 'propmanagerpro' },
  })
  return account
}

export async function getLandlordOnboardingLink(
  accountId: string,
  appUrl: string
) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    return_url: `${appUrl}/dashboard?stripe=connected`,
    refresh_url: `${appUrl}/dashboard/settings?stripe=retry`,
  })
  return link.url
}

// ──────────────────────────────────────────────────────────────
// RENT PAYMENT: Create payment intent
// Tenant pays → money goes to landlord's connected account
// We take a small application fee
// ──────────────────────────────────────────────────────────────
export async function createRentPaymentIntent({
  amountCents,        // e.g. 185000 for $1,850
  landlordAccountId,  // Stripe Connect account ID
  leaseId,
  tenantId,
  propertyId,
  month,
}: {
  amountCents: number
  landlordAccountId: string
  leaseId: string
  tenantId: string
  propertyId: string
  month: string // e.g. '2025-05'
}) {
  // Platform fee: $2 per payment (you keep this)
  const applicationFee = 200 // cents

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    payment_method_types: ['card', 'us_bank_account'],
    application_fee_amount: applicationFee,
    transfer_data: {
      destination: landlordAccountId,
    },
    metadata: {
      lease_id: leaseId,
      tenant_id: tenantId,
      property_id: propertyId,
      month,
      type: 'rent',
    },
  })

  return paymentIntent
}

// ──────────────────────────────────────────────────────────────
// SCREENING FEE: Charge tenant $35 for background check
// Goes to platform account (you), not landlord
// ──────────────────────────────────────────────────────────────
export async function createScreeningFeeIntent(applicationId: string) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 3500, // $35.00
    currency: 'usd',
    payment_method_types: ['card'],
    metadata: {
      application_id: applicationId,
      type: 'screening_fee',
    },
    description: 'Tenant screening fee — credit, criminal, eviction reports',
  })
  return paymentIntent
}

// ──────────────────────────────────────────────────────────────
// SUBSCRIPTIONS: Create checkout for Pro/Portfolio plans
// ──────────────────────────────────────────────────────────────
export async function createSubscriptionCheckout({
  customerId,
  priceId,
  appUrl,
}: {
  customerId: string
  priceId: string
  appUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgrade=success`,
    cancel_url: `${appUrl}/dashboard/settings?upgrade=cancelled`,
  })
  return session.url
}

// Create or retrieve Stripe customer
export async function getOrCreateCustomer(email: string, name: string) {
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) return existing.data[0]

  return stripe.customers.create({ email, name })
}

// Format cents to dollars string
export const formatAmount = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    cents / 100
  )
