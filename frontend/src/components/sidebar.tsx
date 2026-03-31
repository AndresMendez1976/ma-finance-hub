// Sidebar navigation — all modules with expandable sections
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import {
  LayoutDashboard, BookOpen, List, FileText, Scale, Users, CreditCard, Zap,
  BarChart3, FileSpreadsheet, TrendingUp, Banknote, ChevronDown, ChevronRight, Receipt,
  Wallet, Clock, ShoppingCart, Contact, Landmark, Settings, ClipboardList,
  Package, MapPin, ArrowLeftRight, Wrench, Factory, Hammer, HardHat,
  UserCheck, DollarSign, Building, CalendarClock, Target, Bell,
  Box, Layers, SlidersHorizontal, RefreshCw, FileCheck, Briefcase, Timer,
  Gavel, Globe,
} from 'lucide-react';
import { useState } from 'react';

// Navigation structure with expandable groups
interface NavChild { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
interface NavItem { href?: string; label: string; icon: React.ComponentType<{ className?: string }>; children?: NavChild[]; key?: string }

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Contact },
  { href: '/chart-of-accounts', label: 'Charts', icon: BookOpen },
  { href: '/accounts', label: 'Accounts', icon: List },
  { href: '/journal', label: 'Journal', icon: FileText },
  {
    label: 'Invoices', icon: Receipt, key: 'invoices', children: [
      { href: '/invoices', label: 'All Invoices', icon: Receipt },
      { href: '/estimates', label: 'Estimates', icon: FileCheck },
      { href: '/recurring-invoices', label: 'Recurring', icon: RefreshCw },
    ],
  },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/purchase-orders', label: 'Purchases', icon: ClipboardList },
  {
    label: 'Banking', icon: Landmark, key: 'banking', children: [
      { href: '/bank-accounts', label: 'Accounts', icon: Landmark },
      { href: '/banking/rules', label: 'Rules', icon: Gavel },
    ],
  },
  {
    label: 'Inventory', icon: Package, key: 'inventory', children: [
      { href: '/products', label: 'Products', icon: Box },
      { href: '/inventory/locations', label: 'Locations', icon: MapPin },
      { href: '/inventory/adjustments', label: 'Adjustments', icon: SlidersHorizontal },
      { href: '/inventory/transfers', label: 'Transfers', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Manufacturing', icon: Factory, key: 'manufacturing', children: [
      { href: '/manufacturing/bom', label: 'BOM', icon: Layers },
      { href: '/manufacturing/work-orders', label: 'Work Orders', icon: Hammer },
    ],
  },
  {
    label: 'Payroll', icon: DollarSign, key: 'payroll', children: [
      { href: '/employees', label: 'Employees', icon: UserCheck },
      { href: '/payroll', label: 'Pay Runs', icon: DollarSign },
    ],
  },
  {
    label: 'Assets', icon: Building, key: 'assets', children: [
      { href: '/fixed-assets', label: 'Fixed Assets', icon: Building },
      { href: '/maintenance', label: 'Maintenance', icon: Wrench },
      { href: '/maintenance/schedules', label: 'Schedules', icon: CalendarClock },
    ],
  },
  {
    label: 'CRM', icon: Target, key: 'crm', children: [
      { href: '/crm', label: 'Pipeline', icon: Target },
      { href: '/crm/dashboard', label: 'Dashboard', icon: BarChart3 },
    ],
  },
  {
    label: 'Projects', icon: Briefcase, key: 'projects', children: [
      { href: '/projects', label: 'Projects', icon: Briefcase },
      { href: '/time-tracking', label: 'Time Tracking', icon: Timer },
    ],
  },
  { href: '/budgets', label: 'Budgets', icon: HardHat },
  {
    label: 'Reports', icon: BarChart3, key: 'reports', children: [
      { href: '/reports/balance-sheet', label: 'Balance Sheet', icon: FileSpreadsheet },
      { href: '/reports/income-statement', label: 'Income Statement', icon: TrendingUp },
      { href: '/reports/cash-flow', label: 'Cash Flow', icon: Banknote },
      { href: '/trial-balance', label: 'Trial Balance', icon: Scale },
      { href: '/reports/aged-receivables', label: 'Aged Receivables', icon: Clock },
      { href: '/reports/aged-payables', label: 'Aged Payables', icon: ShoppingCart },
      { href: '/reports/inventory-valuation', label: 'Inventory Valuation', icon: Package },
      { href: '/reports/stock-status', label: 'Stock Status', icon: Box },
      { href: '/reports/payroll-summary', label: 'Payroll Summary', icon: DollarSign },
      { href: '/reports/fixed-assets', label: 'Fixed Assets', icon: Building },
      { href: '/reports/production-cost', label: 'Production Cost', icon: Factory },
      { href: '/reports/bom-cost-analysis', label: 'BOM Analysis', icon: Layers },
      { href: '/reports/forecast', label: 'Forecast', icon: TrendingUp },
      { href: '/reports/sales-pipeline', label: 'Sales Pipeline', icon: Target },
      { href: '/reports/project-profitability', label: 'Project Profit', icon: Briefcase },
      { href: '/reports/time-summary', label: 'Time Summary', icon: Timer },
    ],
  },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/posting-rules', label: 'Posting Rules', icon: Zap },
  { href: '/admin', label: 'Admin', icon: Users },
  { href: '/plans', label: 'Plans', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  // Track which expandable groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of nav) {
      if (item.children && item.key) {
        const isActive = item.children.some((c) => pathname.startsWith(c.href));
        if (isActive) initial[item.key] = true;
      }
    }
    return initial;
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="flex h-full w-56 flex-col overflow-y-auto" style={{ backgroundColor: '#1B4332' }}>
      {/* Brand header */}
      <div className="flex h-14 flex-shrink-0 flex-col justify-center border-b border-white/10 px-4">
        <Link href="/dashboard" className="text-lg font-bold leading-tight text-white">MA Finance Hub</Link>
        <span className="text-[10px]" style={{ color: '#95D5B2' }}>Powered by MAiSHQ</span>
      </div>
      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2">
        {nav.map((item) => {
          // Expandable group
          if (item.children && item.key) {
            const isChildActive = item.children.some((c) => pathname.startsWith(c.href));
            const isOpen = openGroups[item.key] ?? false;
            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleGroup(item.key!)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isChildActive ? 'text-white' : 'hover:bg-[#2D6A4F]',
                  )}
                  style={{ color: isChildActive ? '#FFFFFF' : '#95D5B2' }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  <span className="ml-auto">
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
                    {item.children.map((child) => {
                      const active = pathname === child.href || pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-1 text-sm transition-colors',
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
                'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
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
