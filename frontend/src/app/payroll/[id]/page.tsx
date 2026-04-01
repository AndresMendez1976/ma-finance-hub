// Payroll Run detail page
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft, Calculator, CheckCircle, Send } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#5C4033]', calculated: 'bg-[#D4A854] text-[#5C4033]',
  approved: 'bg-[#40916C] text-white', posted: 'bg-[#2D6A4F] text-white',
};

interface PayrollItem {
  id: number; employee_name: string; hours: string; gross_pay: string;
  federal_tax: string; social_security: string; medicare: string;
  state_tax: string; deductions: string; net_pay: string;
}
interface PayrollRun {
  id: number; run_number: string; period_start: string; period_end: string;
  pay_date: string; status: string; total_gross: string; total_net: string;
  total_taxes: string; notes: string | null; items: PayrollItem[];
}

export default function PayrollRunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRun(await api.get<PayrollRun>(`/payroll/${id}`)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const action = async (act: string) => {
    setActionLoading(true); setError('');
    try { await api.post(`/payroll/${id}/${act}`); await load(); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!run) return <Shell><p className="text-[#E07A5F]">{error || 'Payroll run not found'}</p></Shell>;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/payroll"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-[#5C4033]">{run.run_number}</h1>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[run.status] || ''}`}>{run.status.toUpperCase()}</span>
        </div>
        <div className="flex gap-2">
          {run.status === 'draft' && <Button onClick={() => action('calculate')} disabled={actionLoading}><Calculator className="mr-2 h-4 w-4" />Calculate</Button>}
          {run.status === 'calculated' && <Button onClick={() => action('approve')} disabled={actionLoading}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>}
          {run.status === 'approved' && <Button onClick={() => action('post')} disabled={actionLoading}><Send className="mr-2 h-4 w-4" />Post</Button>}
        </div>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#8B7355]">Period</p><p className="font-medium text-[#5C4033]">{formatDate(run.period_start)} - {formatDate(run.period_end)}</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#8B7355]">Pay Date</p><p className="font-medium text-[#5C4033]">{formatDate(run.pay_date)}</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#8B7355]">Total Gross</p><p className="text-xl font-bold font-mono text-[#5C4033]">{formatCurrency(run.total_gross)}</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#8B7355]">Total Net</p><p className="text-xl font-bold font-mono text-[#2D6A4F]">{formatCurrency(run.total_net)}</p>
        </CardContent></Card>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Payroll Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Employee</TH><TH className="text-right">Hours</TH><TH className="text-right">Gross</TH><TH className="text-right">Fed Tax</TH><TH className="text-right">SS</TH><TH className="text-right">Medicare</TH><TH className="text-right">State Tax</TH><TH className="text-right">Deductions</TH><TH className="text-right">Net</TH></TR>
            </THead>
            <TBody>
              {run.items?.map((item) => (
                <TR key={item.id}>
                  <TD>{item.employee_name}</TD>
                  <TD className="text-right font-mono">{Number(item.hours).toFixed(1)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(item.gross_pay)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(item.federal_tax)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(item.social_security)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(item.medicare)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(item.state_tax)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(item.deductions)}</TD>
                  <TD className="text-right font-mono font-bold">{formatCurrency(item.net_pay)}</TD>
                </TR>
              ))}
              {(!run.items || run.items.length === 0) && (
                <TR><TD colSpan={9} className="text-center text-[#8B7355]">No payroll items</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
