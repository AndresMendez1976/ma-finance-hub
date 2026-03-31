'use client';
import { useAuth } from '@/hooks/use-auth';
import { useApi } from '@/hooks/use-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function Topbar() {
  const { context, logout } = useAuth();
  const { data: tierData } = useApi<{ tier: { tierCode: string } | null }>('/tiers/current');

  if (!context) return null;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Tenant {context.jwt.tenantId}</span>
        <Badge variant="secondary">{context.membership.role}</Badge>
        {tierData?.tier && <Badge variant="outline">{tierData.tier.tierCode.toUpperCase()}</Badge>}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm">{context.user.displayName}</span>
        <Button variant="ghost" size="icon" onClick={logout} title="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
