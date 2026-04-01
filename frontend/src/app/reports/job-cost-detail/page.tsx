// Job Cost Detail Report — by project + cost code
'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

interface CostDetail { project_name: string; cost_code: string; cost_code_name: string; category: string; date: string; description: string; amount: string; source: string }
interface ReportResponse { data: CostDetail[]; totals: { total_amount: string } }

export default function JobCostDetailPage() {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set('project_id', projectId);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      setData(await api.get<ReportResponse>(`/reports/job-cost-detail?${params}`));
    } catch { /* */ }
    finally { setLoading(false); }
  }, [projectId, startDate, endDate]);

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">Job Cost Detail Report</h1>
      <div className="mb-4 flex gap-3 items-end flex-wrap">
        <div><label className="text-xs font-medium text-[#2C1810]">Project ID</label><Input value={projectId} onChange={(e) => setProjectId(e.target.value)} type="number" className="w-28" /></div>
        <div><label className="text-xs font-medium text-[#2C1810]">Start Date</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" /></div>
        <div><label className="text-xs font-medium text-[#2C1810]">End Date</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" /></div>
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Run Report'}</Button>
      </div>
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#2C1810]">Cost Details</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead><TR><TH>Project</TH><TH>Cost Code</TH><TH>Category</TH><TH>Date</TH><TH>Description</TH><TH>Source</TH><TH className="text-right">Amount</TH></TR></THead>
              <TBody>
                {data.data.map((d, i) => (
                  <TR key={i}>
                    <TD className="font-medium">{d.project_name}</TD>
                    <TD className="font-mono text-sm">{d.cost_code} <span className="text-[#5C4033]">{d.cost_code_name}</span></TD>
                    <TD><span className="rounded bg-[#E8DCC8] px-2 py-0.5 text-xs">{d.category}</span></TD>
                    <TD>{formatDate(d.date)}</TD>
                    <TD className="text-sm">{d.description}</TD>
                    <TD className="text-xs text-[#5C4033]">{d.source}</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.amount)}</TD>
                  </TR>
                ))}
                {!data.data.length && <TR><TD colSpan={7} className="text-center text-[#5C4033]">No data found</TD></TR>}
              </TBody>
            </Table>
            <div className="mt-4 border-t border-[#E8DCC8] pt-3 flex justify-between font-bold text-[#2C1810]">
              <span>Total</span><span className="font-mono">{formatCurrency(data.totals.total_amount)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
