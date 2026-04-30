import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PropManager Pro — Property Management for Investor-Landlords',
  description: 'The only property management app built for investor-landlords. Rent collection, tenant screening, amortization, market analysis, and QuickBooks export.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
