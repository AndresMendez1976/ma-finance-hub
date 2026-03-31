'use client';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/use-api';
import { Check, X } from 'lucide-react';

interface Tier { id: string; code: string; name: string; description: string | null; sort_order: number }
interface Entitlement { key: string; type: string; enabled: boolean | null; limitValue: number | null }
interface CurrentTier { tier: { tierId: number; tierCode: string } | null; entitlements: Entitlement[] }

export default function PlansPage() {
  const { data: tiers } = useApi<Tier[]>('/tiers/catalog');
  const { data: current } = useApi<CurrentTier>('/tiers/current');

  const entitlementLabels: Record<string, string> = {
    'feature.chart_of_accounts': 'Chart of Accounts',
    'feature.accounts': 'Accounts Management',
    'feature.journal': 'Journal Entries',
    'feature.admin': 'Admin Panel',
    'feature.audit_log': 'Audit Log',
    'limit.max_users': 'Max Users',
    'limit.max_concurrent_sessions': 'Max Sessions',
  };

  // Build entitlement matrix from seed data knowledge
  const matrix: Record<string, Record<string, { enabled?: boolean; limit?: number }>> = {
    basic: { 'feature.chart_of_accounts': { enabled: true }, 'feature.accounts': { enabled: true }, 'feature.journal': { enabled: true }, 'feature.admin': { enabled: false }, 'feature.audit_log': { enabled: false }, 'limit.max_users': { limit: 3 }, 'limit.max_concurrent_sessions': { limit: 2 } },
    standard: { 'feature.chart_of_accounts': { enabled: true }, 'feature.accounts': { enabled: true }, 'feature.journal': { enabled: true }, 'feature.admin': { enabled: true }, 'feature.audit_log': { enabled: false }, 'limit.max_users': { limit: 10 }, 'limit.max_concurrent_sessions': { limit: 5 } },
    pro: { 'feature.chart_of_accounts': { enabled: true }, 'feature.accounts': { enabled: true }, 'feature.journal': { enabled: true }, 'feature.admin': { enabled: true }, 'feature.audit_log': { enabled: true }, 'limit.max_users': { limit: 50 }, 'limit.max_concurrent_sessions': { limit: 20 } },
    max_pro: { 'feature.chart_of_accounts': { enabled: true }, 'feature.accounts': { enabled: true }, 'feature.journal': { enabled: true }, 'feature.admin': { enabled: true }, 'feature.audit_log': { enabled: true }, 'limit.max_users': { limit: 500 }, 'limit.max_concurrent_sessions': { limit: 100 } },
  };

  return (
    <Shell>
      <h1 className="mb-2 text-2xl font-bold">Plans & Pricing</h1>
      <p className="mb-6 text-muted-foreground">
        Current plan: <Badge variant="default" className="ml-1">{current?.tier?.tierCode.toUpperCase() || 'None'}</Badge>
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiers?.map((tier) => {
          const isCurrent = current?.tier?.tierCode === tier.code;
          const ent = matrix[tier.code] || {};
          return (
            <Card key={tier.id} className={isCurrent ? 'border-primary border-2' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(entitlementLabels).map(([key, label]) => {
                    const val = ent[key];
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span>{label}</span>
                        {val?.enabled !== undefined ? (
                          val.enabled ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-400" />
                        ) : (
                          <span className="font-mono font-bold">{val?.limit}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4">
                  {isCurrent ? (
                    <Button disabled className="w-full" variant="outline">Current Plan</Button>
                  ) : (
                    <Button className="w-full" variant="outline" onClick={() => alert('Plan changes are managed by your account administrator. Contact support to upgrade.')}>
                      {(tier.sort_order > (tiers.find((t) => t.code === current?.tier?.tierCode)?.sort_order || 0)) ? 'Request Upgrade' : 'Request Change'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Plan changes are managed internally. Self-service tier changes are disabled for security. Contact your account administrator or use the internal operations API to modify tier assignments.</p>
        </CardContent>
      </Card>
    </Shell>
  );
}
