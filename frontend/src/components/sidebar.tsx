'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { LayoutDashboard, BookOpen, List, FileText, Scale, Cog, Users, CreditCard, Zap } from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chart-of-accounts', label: 'Charts', icon: BookOpen },
  { href: '/accounts', label: 'Accounts', icon: List },
  { href: '/journal', label: 'Journal', icon: FileText },
  { href: '/trial-balance', label: 'Trial Balance', icon: Scale },
  { href: '/posting-rules', label: 'Posting Rules', icon: Zap },
  { href: '/admin', label: 'Admin', icon: Users },
  { href: '/plans', label: 'Plans', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-56 flex-col border-r bg-muted/30">
      <div className="flex h-14 flex-col justify-center border-b px-4">
        <Link href="/dashboard" className="text-lg font-bold leading-tight">MA Finance Hub</Link>
        <span className="text-[10px] text-muted-foreground">Powered by MAiSHQ</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
