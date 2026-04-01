// Sidebar navigation — organized by section with expandable groups
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
  Gavel,
} from 'lucide-react';
import { useState } from 'react';

// Types
interface NavChild { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
interface NavItem { href?: string; label: string; icon: React.ComponentType<{ className?: string }>; children?: NavChild[]; key?: string }
interface NavSection { header?: string; items: NavItem[] }

const sections: NavSection[] = [
  // Top-level (no header)
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  // SALES
  {
    header: 'SALES',
    items: [
      {
        label: 'Invoices', icon: Receipt, key: 'invoices', children: [
          { href: '/invoices', label: 'All Invoices', icon: Receipt },
          { href: '/estimates', label: 'Estimates', icon: FileCheck },
          { href: '/recurring-invoices', label: 'Recurring', icon: RefreshCw },
          { href: '/credit-notes', label: 'Credit Notes', icon: FileText },
        ],
      },
    ],
  },
  // EXPENSES
  {
    header: 'EXPENSES',
    items: [
      {
        label: 'Expenses', icon: Wallet, key: 'expenses', children: [
          { href: '/expenses', label: 'All Expenses', icon: Wallet },
          { href: '/recurring-expenses', label: 'Recurring', icon: RefreshCw },
          { href: '/mileage', label: 'Mileage', icon: MapPin },
        ],
      },
      { href: '/bills', label: 'Bills', icon: FileText },
      { href: '/purchase-orders', label: 'Purchases', icon: ShoppingCart },
    ],
  },
  // FINANCE
  {
    header: 'FINANCE',
    items: [
      {
        label: 'Banking', icon: Landmark, key: 'banking', children: [
          { href: '/bank-accounts', label: 'Accounts', icon: Landmark },
          { href: '/banking/rules', label: 'Rules', icon: Gavel },
        ],
      },
      { href: '/accounts', label: 'Accounts', icon: BookOpen },
      { href: '/journal', label: 'Journal', icon: FileText },
      { href: '/posting-rules', label: 'Posting Rules', icon: Zap },
    ],
  },
  // OPERATIONS
  {
    header: 'OPERATIONS',
    items: [
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
        label: 'Projects', icon: Briefcase, key: 'projects', children: [
          { href: '/projects', label: 'Projects', icon: Briefcase },
          { href: '/time-tracking', label: 'Time Tracking', icon: Timer },
          { href: '/cost-codes', label: 'Cost Codes', icon: List },
        ],
      },
      { href: '/equipment', label: 'Equipment', icon: Wrench },
    ],
  },
  // PEOPLE
  {
    header: 'PEOPLE',
    items: [
      { href: '/contacts', label: 'Contacts', icon: Contact },
      {
        label: 'CRM', icon: Target, key: 'crm', children: [
          { href: '/crm', label: 'Pipeline', icon: Target },
          { href: '/crm/dashboard', label: 'Dashboard', icon: BarChart3 },
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
    ],
  },
  // ANALYTICS
  {
    header: 'ANALYTICS',
    items: [
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
          { href: '/reports/job-cost-detail', label: 'Job Cost', icon: List },
          { href: '/reports/wip', label: 'WIP Report', icon: BarChart3 },
          { href: '/reports/equipment-cost', label: 'Equipment Cost', icon: Wrench },
          { href: '/reports/mileage-summary', label: 'Mileage', icon: MapPin },
          { href: '/reports/1099-summary', label: '1099 Summary', icon: FileText },
          { href: '/reports/financial-ratios', label: 'Ratios', icon: TrendingUp },
        ],
      },
      { href: '/budgets', label: 'Budgets', icon: HardHat },
    ],
  },
  // Notifications (standalone)
  {
    items: [
      { href: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  // ADMIN
  {
    header: 'ADMIN',
    items: [
      { href: '/admin', label: 'Admin', icon: Users },
      { href: '/plans', label: 'Plans', icon: ClipboardList },
      {
        label: 'Settings', icon: Settings, key: 'settings', children: [
          { href: '/settings', label: 'General', icon: Settings },
          { href: '/settings/templates', label: 'Templates', icon: FileText },
          { href: '/settings/companies', label: 'Companies', icon: Building },
          { href: '/settings/security', label: 'Security', icon: Users },
        ],
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Track which expandable groups are open (auto-open active ones)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of sections) {
      for (const item of section.items) {
        if (item.children && item.key) {
          const isActive = item.children.some((c) => pathname.startsWith(c.href));
          if (isActive) initial[item.key] = true;
        }
      }
    }
    return initial;
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderNavItem = (item: NavItem) => {
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
  };

  return (
    <aside className="flex h-full w-56 flex-col overflow-y-auto" style={{ backgroundColor: '#1B4332' }}>
      {/* Brand header */}
      <div className="flex h-14 flex-shrink-0 flex-col justify-center border-b border-white/10 px-4">
        <Link href="/dashboard" className="text-lg font-bold leading-tight text-white">MA Finance Hub</Link>
        <span className="text-[10px]" style={{ color: '#95D5B2' }}>Powered by MAiSHQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {sections.map((section, sIdx) => (
          <div key={section.header ?? `section-${sIdx}`}>
            {/* Section header with divider */}
            {section.header && (
              <div className="mt-4 mb-1 flex items-center gap-2 px-3">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: '#5C4033' }}
                >
                  {section.header}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
              </div>
            )}
            {/* Section items */}
            <div className="space-y-0.5">
              {section.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
