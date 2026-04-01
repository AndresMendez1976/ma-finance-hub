// Progress Billing — AIA G702-style billing grid
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BillingLine {
  item: string; description: string; scheduled_value: string;
  prev_completed: string; this_period: string; materials_stored: string;
  total_completed: string; pct_complete: number; balance_to_finish: string; retainage: string;
}
interface ProgressBilling { project_name: string; application_number: number; period_to: string; lines: BillingLine[]; total_contract: string; total_completed: string; total_retainage: string; amount_due: string }

export default function ProgressBillingPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<ProgressBilling | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get<ProgressBilling>(`/projects/${id}/progress-billing`)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Shell><p className="text-[#5C4033]">Loading...</p></Shell>;
  if (!data) return <Shell><p className="text-[#E07A5F]">Progress billing not available</p></Shell>;

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/projects/${id}`}><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-[#2C1810]">{data.project_name} - Progress Billing</h1>
      </div>
      <div className="mb-4 flex gap-6 text-sm text-[#5C4033]">
        <span>Application #{data.application_number}</span>
        <span>Period to: {formatDate(data.period_to)}</span>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#2C1810]">AIA G702 Schedule of Values</CardTitle></CardHeader>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Item</TH><TH>Description</TH><TH className="text-right">Scheduled Value</TH>
                <TH className="text-right">Prev. Completed</TH><TH className="text-right">This Period</TH>
                <TH className="text-right">Materials Stored</TH><TH className="text-right">Total Completed</TH>
                <TH className="text-right">%</TH><TH className="text-right">Balance</TH><TH className="text-right">Retainage</TH>
              </TR>
            </THead>
            <TBody>
              {data.lines.map((l, i) => (
                <TR key={i}>
                  <TD className="font-mono text-sm">{l.item}</TD>
                  <TD>{l.description}</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.scheduled_value)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.prev_completed)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.this_period)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.materials_stored)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.total_completed)}</TD>
                  <TD className="text-right font-mono text-sm">{l.pct_complete}%</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.balance_to_finish)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.retainage)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="mt-4 border-t border-[#E8DCC8] pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-[#5C4033]">Total Contract</p><p className="text-lg font-bold font-mono text-[#2C1810]">{formatCurrency(data.total_contract)}</p></div>
            <div><p className="text-xs text-[#5C4033]">Total Completed</p><p className="text-lg font-bold font-mono text-[#2D6A4F]">{formatCurrency(data.total_completed)}</p></div>
            <div><p className="text-xs text-[#5C4033]">Retainage</p><p className="text-lg font-bold font-mono text-[#D4A854]">{formatCurrency(data.total_retainage)}</p></div>
            <div><p className="text-xs text-[#5C4033]">Amount Due</p><p className="text-lg font-bold font-mono text-[#2C1810]">{formatCurrency(data.amount_due)}</p></div>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
