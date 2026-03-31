'use client';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useApi } from '@/hooks/use-api';

export default function DashboardPage() {
  const { context } = useAuth();
  const { data: tier } = useApi<{ tier: { tierCode: string } | null; entitlements: { key: string; enabled: boolean | null; limitValue: number | null }[] }>('/tiers/current');
  const { data: lockDate } = useApi<{ lock_date: string | null }>('/admin/lock-date');
  const { data: users } = useApi<{ user_id: string }[]>('/admin/users');
  const { data: charts } = useApi<{ id: string }[]>('/chart-of-accounts');
  const { data: entries } = useApi<{ id: string; status: string }[]>('/journal-entries');

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Tenant</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{context?.jwt.tenantId}</p><p className="text-xs text-muted-foreground">ID</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Tier</CardTitle></CardHeader>
          <CardContent><Badge variant="outline" className="text-lg">{tier?.tier?.tierCode?.toUpperCase() || 'None'}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{users?.length ?? '—'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Lock Date</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold">{lockDate?.lock_date || 'Not set'}</p></CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Entitlements</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tier?.entitlements?.map((e) => (
                <div key={e.key} className="flex items-center justify-between text-sm">
                  <span>{e.key}</span>
                  {e.enabled !== null ? <Badge variant={e.enabled ? 'success' : 'destructive'}>{e.enabled ? 'ON' : 'OFF'}</Badge>
                    : <span className="font-mono">{e.limitValue}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span>Charts of Accounts</span><span className="font-bold">{charts?.length ?? 0}</span></div>
            <div className="flex justify-between text-sm"><span>Journal Entries</span><span className="font-bold">{entries?.length ?? 0}</span></div>
            <div className="flex justify-between text-sm"><span>Posted</span><span className="font-bold">{entries?.filter((e) => e.status === 'posted').length ?? 0}</span></div>
            <div className="flex justify-between text-sm"><span>Role</span><Badge variant="secondary">{context?.membership.role}</Badge></div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
