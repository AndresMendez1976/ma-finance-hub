'use client';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/use-api';
import { Download } from 'lucide-react';

interface TB { account_id: string; account_code: string; account_name: string; account_type: string; total_debit: number; total_credit: number; balance: number }

export default function TrialBalancePage() {
  const { data, loading } = useApi<TB[]>('/journal-entries/trial-balance');
  const totalDebit = data?.reduce((s, r) => s + r.total_debit, 0) ?? 0;
  const totalCredit = data?.reduce((s, r) => s + r.total_credit, 0) ?? 0;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trial Balance</h1>
        <Button size="sm" variant="outline" onClick={() => window.open('/api/v1/admin/export/trial-balance', '_blank')}>
          <Download className="mr-2 h-4 w-4" />Export</Button>
      </div>
      {loading ? <p>Loading...</p> : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <THead><TR><TH>Code</TH><TH>Account</TH><TH>Type</TH><TH className="text-right">Debit</TH><TH className="text-right">Credit</TH><TH className="text-right">Balance</TH></TR></THead>
              <TBody>
                {data?.map((r) => (
                  <TR key={r.account_id}><TD className="font-mono">{r.account_code}</TD><TD>{r.account_name}</TD><TD>{r.account_type}</TD>
                    <TD className="text-right font-mono">{r.total_debit.toFixed(2)}</TD><TD className="text-right font-mono">{r.total_credit.toFixed(2)}</TD>
                    <TD className="text-right font-mono font-bold">{r.balance.toFixed(2)}</TD></TR>
                ))}
                {(!data || data.length === 0) && <TR><TD colSpan={6} className="text-center text-muted-foreground">No posted entries</TD></TR>}
                {data && data.length > 0 && (
                  <TR className="border-t-2 font-bold"><TD colSpan={3}>Total</TD>
                    <TD className="text-right font-mono">{totalDebit.toFixed(2)}</TD><TD className="text-right font-mono">{totalCredit.toFixed(2)}</TD>
                    <TD className="text-right font-mono">{(totalDebit - totalCredit).toFixed(2)}</TD></TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
