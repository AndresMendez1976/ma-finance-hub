// Payroll Summary Report
'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Download } from 'lucide-react';

interface PayrollSummary {
  period_start: string; period_end: string;
  total_gross: number; total_federal: number; total_social_security: number;
  total_medicare: number; total_state: number; total_deductions: number;
  total_net: number; total_employer_taxes: number;
}

export default function PayrollSummaryPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!from || !to) return;
    setLoading(true);
    try { setData(await api.get<PayrollSummary>(`/reports/payroll-summary?from=${from}&to=${to}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Payroll Summary Report</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <span className="text-[#8B7355]">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
          {data && (
            <Button size="sm" variant="outline" onClick={() => window.open(`/api/v1/reports/payroll-summary/export?from=${from}&to=${to}`, '_blank')}>
              <Download className="mr-2 h-4 w-4" />CSV
            </Button>
          )}
        </div>
      </div>
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30">
            <CardTitle className="text-[#5C4033]">{data.period_start} to {data.period_end}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead>
                <TR><TH>Category</TH><TH className="text-right">Amount</TH></TR>
              </THead>
              <TBody>
                <TR><TD className="font-medium">Total Gross Pay</TD><TD className="text-right font-mono font-bold">{fmt(data.total_gross)}</TD></TR>
                <TR><TD className="text-[#8B7355]">Federal Withholding</TD><TD className="text-right font-mono">{fmt(data.total_federal)}</TD></TR>
                <TR><TD className="text-[#8B7355]">Social Security</TD><TD className="text-right font-mono">{fmt(data.total_social_security)}</TD></TR>
                <TR><TD className="text-[#8B7355]">Medicare</TD><TD className="text-right font-mono">{fmt(data.total_medicare)}</TD></TR>
                <TR><TD className="text-[#8B7355]">State Withholding</TD><TD className="text-right font-mono">{fmt(data.total_state)}</TD></TR>
                <TR><TD className="text-[#8B7355]">Deductions</TD><TD className="text-right font-mono">{fmt(data.total_deductions)}</TD></TR>
                <TR className="border-t-2 border-[#E8DCC8]">
                  <TD className="font-bold text-[#2D6A4F]">Total Net Pay</TD>
                  <TD className="text-right font-mono font-bold text-[#2D6A4F]">{fmt(data.total_net)}</TD>
                </TR>
                <TR><TD className="font-medium text-[#D4A854]">Employer Taxes</TD><TD className="text-right font-mono font-bold text-[#D4A854]">{fmt(data.total_employer_taxes)}</TD></TR>
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {!data && !loading && <p className="text-[#8B7355]">Select a date range and click Generate.</p>}
    </Shell>
  );
}
