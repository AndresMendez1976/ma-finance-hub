'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const tiers = [
  {
    name: 'Starter',
    price: 29,
    description: 'For freelancers and sole proprietors',
    popular: false,
    features: [
      'Chart of Accounts',
      'Journal Entries',
      'Invoicing (50/mo)',
      'Expense Tracking',
      'Basic Reports',
      'Up to 3 users',
      'Email Support',
    ],
  },
  {
    name: 'Professional',
    price: 79,
    description: 'For growing businesses',
    popular: true,
    features: [
      'Everything in Starter',
      'Unlimited Invoicing',
      'Bank Reconciliation',
      'Multi-currency',
      'Budgets & Forecasting',
      'Aged Reports',
      'Up to 10 users',
      'Priority Support',
    ],
  },
  {
    name: 'Business',
    price: 149,
    description: 'For established companies',
    popular: false,
    features: [
      'Everything in Professional',
      'Purchase Orders',
      'Inventory Management',
      'Payroll',
      'Fixed Assets',
      'Project Tracking',
      'CRM Integration',
      'Up to 25 users',
      'API Access',
    ],
  },
  {
    name: 'Enterprise',
    price: 299,
    description: 'For large organizations',
    popular: false,
    features: [
      'Everything in Business',
      'Manufacturing & BOM',
      'Custom Fields',
      'Client Portal',
      'Webhooks',
      'Data Export',
      'Unlimited Users',
      'Dedicated Support',
      'Custom Integrations',
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <div className="py-6 text-center">
        <Link href="/" className="text-xl font-bold" style={{ color: '#2C1810' }}>MA Finance Hub</Link>
        <p className="mt-1 text-sm" style={{ color: '#5C4033' }}>Powered by MAiSHQ</p>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold" style={{ color: '#2C1810' }}>Simple, transparent pricing</h1>
          <p className="mt-2 text-lg" style={{ color: '#5C4033' }}>Choose the plan that fits your business. All plans include a 14-day free trial.</p>
        </div>

        {/* Tier cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <Card key={tier.name} className={`relative flex flex-col ${tier.popular ? 'ring-2 ring-[#8B5E3C]' : ''}`}>
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#8B5E3C] text-white">MOST POPULAR</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-lg" style={{ color: '#2C1810' }}>{tier.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold" style={{ color: '#2C1810' }}>${tier.price}</span>
                  <span className="text-sm" style={{ color: '#5C4033' }}>/month</span>
                </div>
                <p className="mt-1 text-sm" style={{ color: '#5C4033' }}>{tier.description}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm" style={{ color: '#2C1810' }}>
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#6B8F71' }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-6 block">
                  <Button className="w-full" variant={tier.popular ? 'default' : 'outline'}>
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Standalone license section */}
        <div className="mt-16">
          <Card className="mx-auto max-w-2xl">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-bold" style={{ color: '#2C1810' }}>Standalone License</h2>
              <p className="mt-2" style={{ color: '#5C4033' }}>
                Need a self-hosted solution? Our standalone license includes full source code access,
                unlimited users, and one year of updates. Perfect for organizations that need complete
                control over their data and infrastructure.
              </p>
              <p className="mt-4">
                <span className="text-2xl font-bold" style={{ color: '#2C1810' }}>Contact us</span>
                <span className="text-sm" style={{ color: '#5C4033' }}> for pricing</span>
              </p>
              <a href="mailto:sales@maishq.com" className="mt-4 inline-block">
                <Button variant="outline">Request a Quote</Button>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Footer links */}
        <div className="mt-12 text-center text-sm" style={{ color: '#5C4033' }}>
          <Link href="/login" className="underline">Sign In</Link>
          {' | '}
          <Link href="/register" className="underline">Register</Link>
          {' | '}
          <Link href="/legal/terms" className="underline">Terms</Link>
          {' | '}
          <Link href="/legal/privacy" className="underline">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
