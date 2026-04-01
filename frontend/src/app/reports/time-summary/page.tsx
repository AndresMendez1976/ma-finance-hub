'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { Download, Clock } from 'lucide-react';

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface TimeSummaryRow {
  project_name: string; employee_name: string; total_hours: number; total_amount: number;
}

export default function TimeSummaryReportPage() {
  const [data, setData] = useState<TimeSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (projectId) params.set('project_id', projectId);
      if (employeeId) params.set('employee_id', employeeId);
      const res = await api.get<TimeSummaryRow[]>(`/reports/time-summary?${params}`);
      setData(extractArray(res));
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [from, to, projectId, employeeId]);

  const exportCsv = () => {
    const header = 'Project,Employee,Hours,Amount\n';
    const rows = data.map((r) => `"${r.project_name}","${r.employee_name}",${r.total_hours.toFixed(1)},${r.total_amount.toFixed(2)}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'time-summary.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const totalHours = data.reduce((s, r) => s + r.total_hours, 0);
  const totalAmount = data.reduce((s, r) => s + r.total_amount, 0);

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Time Summary Report</h1>
        {data.length > 0 && <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
        <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">Project ID</label>
          <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-32" placeholder="All" /></div>
        <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">Employee ID</label>
          <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-32" placeholder="All" /></div>
        <Button onClick={load}>Run Report</Button>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Project</TH><TH>Employee</TH><TH className="text-right">Hours</TH><TH className="text-right">Amount</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={4} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data.map((r, i) => (
                <TR key={i}>
                  <TD className="font-medium">{r.project_name}</TD>
                  <TD>{r.employee_name}</TD>
                  <TD className="text-right font-mono">{r.total_hours.toFixed(1)}</TD>
                  <TD className="text-right font-mono">{fmt(r.total_amount)}</TD>
                </TR>
              ))}
              {!loading && data.length > 0 && (
                <TR className="bg-[#E8DCC8]/20 font-bold">
                  <TD colSpan={2}>Totals</TD>
                  <TD className="text-right font-mono">{totalHours.toFixed(1)}</TD>
                  <TD className="text-right font-mono">{fmt(totalAmount)}</TD>
                </TR>
              )}
              {!loading && data.length === 0 && (
                <TR><TD colSpan={4} className="text-center text-[#8B7355]">
                  <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />Run report to see data
                </TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
