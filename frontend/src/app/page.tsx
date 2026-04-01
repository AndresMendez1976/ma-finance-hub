'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicNavbar } from '@/components/public-navbar';
import { PublicFooter } from '@/components/public-footer';
import {
  BookOpen, FileText, Package, DollarSign, Factory, Users,
  CheckCircle, ArrowRight,
} from 'lucide-react';

const features = [
  { icon: BookOpen, title: 'Complete Accounting', desc: 'General ledger, GAAP-compliant chart of accounts, journal entries, and financial reports.' },
  { icon: FileText, title: 'Smart Invoicing', desc: 'Create, send, and track invoices. Recurring billing, payment portal, and aging reports.' },
  { icon: Package, title: 'Advanced Inventory', desc: 'FIFO, LIFO, and Average Cost methods. Multi-location tracking and stock alerts.' },
  { icon: DollarSign, title: 'Built-in Payroll', desc: 'Federal and state tax calculations, pay runs, direct deposit, and W-2 data generation.' },
  { icon: Factory, title: 'Manufacturing ERP', desc: 'Bill of Materials, work orders, production scheduling, and cost tracking.' },
  { icon: Users, title: 'CRM & Projects', desc: 'Sales pipeline, time tracking, project profitability, and client management.' },
];

const whyItems = [
  { title: '3 Costing Methods', desc: 'FIFO, LIFO, and Average Cost vs QuickBooks\' single method.' },
  { title: 'Unlimited Custom Fields', desc: 'Extend any entity with your own fields vs QB\'s 48 limit.' },
  { title: 'External Collaborators', desc: 'Invite your accountant or auditor with scoped read-only access.' },
  { title: 'No Vendor Lock-in', desc: 'Export all your data anytime. Self-host option available.' },
];

const plans = [
  { name: 'Starter', price: 29, popular: false },
  { name: 'Professional', price: 79, popular: true },
  { name: 'Business', price: 149, popular: false },
  { name: 'Enterprise', price: 299, popular: false },
];

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        router.replace('/dashboard');
        return;
      }
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <PublicNavbar />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#F5F0E8] to-white px-6 py-20 text-center">
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight text-[#2C1810] md:text-5xl">
          The ERP That Grows With Your Business
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[#5C4033]">
          Accounting, Invoicing, Inventory, Payroll, Manufacturing, CRM — all in one platform.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-[#2D6A4F] px-6 py-3 font-semibold text-white hover:bg-[#40916C]"
          >
            Start Free Trial
          </Link>
          <Link
            href="#pricing"
            className="rounded-lg border-2 border-[#2D6A4F] px-6 py-3 font-semibold text-[#2D6A4F] hover:bg-[#2D6A4F]/5"
          >
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold text-[#2C1810]">
          Everything You Need to Run Your Business
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[#E8DCC8] bg-white p-6 shadow-sm"
            >
              <f.icon className="mb-3 h-8 w-8 text-[#2D6A4F]" />
              <h3 className="mb-2 text-lg font-semibold text-[#2C1810]">{f.title}</h3>
              <p className="text-sm text-[#5C4033]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why MA Finance Hub */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-bold text-[#2C1810]">
            Why MA Finance Hub?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {whyItems.map((w) => (
              <div key={w.title} className="flex gap-3">
                <CheckCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#2D6A4F]" />
                <div>
                  <h3 className="font-semibold text-[#2C1810]">{w.title}</h3>
                  <p className="mt-1 text-sm text-[#5C4033]">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold text-[#2C1810]">
          Simple, Transparent Pricing
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-xl border bg-white p-6 text-center shadow-sm ${
                p.popular ? 'border-[#2D6A4F] ring-2 ring-[#2D6A4F]' : 'border-[#E8DCC8]'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2D6A4F] px-3 py-0.5 text-xs font-semibold text-white">
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-lg font-semibold text-[#2C1810]">{p.name}</h3>
              <p className="mt-2 text-3xl font-bold text-[#2C1810]">
                ${p.price}<span className="text-base font-normal text-[#5C4033]">/mo</span>
              </p>
              <Link
                href="/register"
                className="mt-4 inline-block rounded-md bg-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#40916C]"
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-1 text-sm font-medium text-[#2D6A4F] hover:underline">
            See all plans <ArrowRight className="h-4 w-4" />
          </Link>
        </p>
      </section>

      <PublicFooter />
    </div>
  );
}
