'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { BarChart3 } from 'lucide-react';

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ProfitRow {
  project_name: string; client_name: string; total_revenue: number;
  total_cost: number; profit: number; margin_percent: number;
}

export default function ProjectProfitabilityPage() {
  const [data, setData] = useState<ProfitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get<ProfitRow[]>(`/reports/project-profitability?${params}`);
      setData(res);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [from, to]);

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">Project Profitability Report</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
        <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        <Button onClick={load}>Run Report</Button>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Project</TH><TH>Client</TH><TH className="text-right">Revenue</TH><TH className="text-right">Cost</TH><TH className="text-right">Profit</TH><TH className="text-right">Margin %</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={6} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data.map((r, i) => (
                <TR key={i}>
                  <TD className="font-medium">{r.project_name}</TD>
                  <TD>{r.client_name}</TD>
                  <TD className="text-right font-mono">{fmt(r.total_revenue)}</TD>
                  <TD className="text-right font-mono">{fmt(r.total_cost)}</TD>
                  <TD className="text-right font-mono" style={{ color: r.profit >= 0 ? '#2D6A4F' : '#E07A5F' }}>
                    {fmt(r.profit)}
                  </TD>
                  <TD className="text-right font-mono" style={{ color: r.margin_percent >= 0 ? '#2D6A4F' : '#E07A5F' }}>
                    {r.margin_percent.toFixed(1)}%
                  </TD>
                </TR>
              ))}
              {!loading && data.length === 0 && (
                <TR><TD colSpan={6} className="text-center text-[#8B7355]">
                  <BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-40" />Run report to see data
                </TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
