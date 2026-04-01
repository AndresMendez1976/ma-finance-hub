// Payroll Runs list page
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Plus, DollarSign, Eye, AlertTriangle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#2C1810]',
  calculated: 'bg-[#D4A854] text-[#2C1810]',
  approved: 'bg-[#40916C] text-white',
  posted: 'bg-[#2D6A4F] text-white',
};

interface PayrollRun {
  id: number; run_number: string; period_start: string; period_end: string;
  pay_date: string; status: string; total_gross: string; total_net: string;
}
interface PayrollResponse {
  data: PayrollRun[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export default function PayrollPage() {
  const [data, setData] = useState<PayrollResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '25' });
      const res = await api.get<PayrollResponse>(`/payroll?${params}`);
      setData(res);
      setPage(p);
      setInitialLoad(false);
    } catch { /* handled by api */ }
    finally { setLoading(false); }
  }, []);

  if (initialLoad && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#D4A854] bg-[#D4A854]/10 p-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[#D4A854]" />
        <p className="text-sm text-[#2C1810]">
          <span className="font-semibold">Tax Disclaimer:</span> Payroll tax calculations are estimates based on simplified federal and state tax tables. These calculations may not reflect your exact tax liability. Consult a licensed tax professional or CPA before filing.
        </p>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Payroll Runs</h1>
        <Link href="/payroll/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Payroll Run</Button>
        </Link>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Run#</TH><TH>Period Start</TH><TH>Period End</TH><TH>Pay Date</TH><TH>Status</TH><TH className="text-right">Total Gross</TH><TH className="text-right">Total Net</TH><TH>Actions</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={8} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data?.data.map((run) => (
                <TR key={run.id}>
                  <TD className="font-mono text-sm">{run.run_number}</TD>
                  <TD>{formatDate(run.period_start)}</TD>
                  <TD>{formatDate(run.period_end)}</TD>
                  <TD>{formatDate(run.pay_date)}</TD>
                  <TD>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[run.status] || ''}`}>
                      {run.status}
                    </span>
                  </TD>
                  <TD className="text-right font-mono">{formatCurrency(run.total_gross)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(run.total_net)}</TD>
                  <TD>
                    <Link href={`/payroll/${run.id}`}>
                      <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                    </Link>
                  </TD>
                </TR>
              ))}
              {!loading && !data?.data.length && (
                <TR><TD colSpan={8} className="text-center text-[#5C4033]">
                  <DollarSign className="mx-auto mb-2 h-8 w-8 opacity-40" />No payroll runs found
                </TD></TR>
              )}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#5C4033]">
              <span>Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= data.pagination.pages} onClick={() => load(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
