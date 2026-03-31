'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import {
  LayoutDashboard, BookOpen, List, FileText, Scale, Users, CreditCard, Zap,
  BarChart3, FileSpreadsheet, TrendingUp, Banknote, ChevronDown, ChevronRight, Receipt,
  Wallet, Clock, ShoppingCart,
} from 'lucide-react';
import { useState } from 'react';

// Navigation items with optional sub-items for Reports section
const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chart-of-accounts', label: 'Charts', icon: BookOpen },
  { href: '/accounts', label: 'Accounts', icon: List },
  { href: '/journal', label: 'Journal', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  {
    label: 'Reports', icon: BarChart3, children: [
      { href: '/reports/balance-sheet', label: 'Balance Sheet', icon: FileSpreadsheet },
      { href: '/reports/income-statement', label: 'Income Statement', icon: TrendingUp },
      { href: '/reports/cash-flow', label: 'Cash Flow', icon: Banknote },
      { href: '/trial-balance', label: 'Trial Balance', icon: Scale },
      { href: '/reports/aged-receivables', label: 'Aged Receivables', icon: Clock },
      { href: '/reports/aged-payables', label: 'Aged Payables', icon: ShoppingCart },
    ],
  },
  { href: '/posting-rules', label: 'Posting Rules', icon: Zap },
  { href: '/admin', label: 'Admin', icon: Users },
  { href: '/plans', label: 'Plans', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const [reportsOpen, setReportsOpen] = useState(
    pathname.startsWith('/reports') || pathname.startsWith('/trial-balance'),
  );

  return (
    <aside className="flex h-full w-56 flex-col" style={{ backgroundColor: '#1B4332' }}>
      {/* Brand header */}
      <div className="flex h-14 flex-col justify-center border-b border-white/10 px-4">
        <Link href="/dashboard" className="text-lg font-bold leading-tight text-white">MA Finance Hub</Link>
        <span className="text-[10px]" style={{ color: '#95D5B2' }}>Powered by MAiSHQ</span>
      </div>
      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {nav.map((item) => {
          // Expandable group (Reports)
          if ('children' in item && item.children) {
            const isChildActive = item.children.some((c) => pathname.startsWith(c.href));
            return (
              <div key={item.label}>
                <button
                  onClick={() => setReportsOpen(!reportsOpen)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isChildActive ? 'text-white' : 'hover:bg-[#2D6A4F]',
                  )}
                  style={{ color: isChildActive ? '#FFFFFF' : '#95D5B2' }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  <span className="ml-auto">
                    {reportsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </span>
                </button>
                {reportsOpen && (
                  <div className="ml-3 space-y-1 border-l border-white/10 pl-2">
                    {item.children.map((child) => {
                      const active = pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors',
                            active ? 'font-semibold text-white' : 'hover:bg-[#2D6A4F]',
                          )}
                          style={{ color: active ? '#FFFFFF' : '#95D5B2', backgroundColor: active ? '#2D6A4F' : undefined }}
                        >
                          <child.icon className="h-3.5 w-3.5" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular nav item
          const active = pathname.startsWith(item.href!);
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active ? 'font-semibold' : 'hover:bg-[#2D6A4F]',
              )}
              style={{
                color: active ? '#FFFFFF' : '#95D5B2',
                backgroundColor: active ? '#2D6A4F' : undefined,
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
