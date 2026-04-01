'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/format';

// Backend response shape from GET /crm/dashboard
interface StageValue { stage_name: string; count: string; total_value: string; weighted_value: string; sort_order: number }
interface DashData {
  pipeline_by_stage: StageValue[];
  open_pipeline: { count: number; total_value: number; weighted_value: number };
  win_rate: number;
  avg_deal_size: number;
  won: { count: number; total_value: number };
  lost: { count: number; total_value: number };
}

export default function CrmDashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashData>('/crm/dashboard').then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Shell><p className="text-[#5C4033]">Loading...</p></Shell>;

  // Handle empty state gracefully — show zero KPIs instead of error
  const d = data ?? { pipeline_by_stage: [], open_pipeline: { count: 0, total_value: 0, weighted_value: 0 }, win_rate: 0, avg_deal_size: 0, won: { count: 0, total_value: 0 }, lost: { count: 0, total_value: 0 } };

  const kpiCards = [
    { label: 'Pipeline Value', value: formatCurrency(d.open_pipeline.total_value), color: '#2C1810' },
    { label: 'Weighted Value', value: formatCurrency(d.open_pipeline.weighted_value), color: '#2D6A4F' },
    { label: 'Win Rate', value: `${d.win_rate.toFixed(1)}%`, color: '#D4A854' },
    { label: 'Avg Deal Size', value: formatCurrency(d.avg_deal_size), color: '#5C4033' },
  ];

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">CRM Dashboard</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardHeader><CardTitle className="text-sm text-[#5C4033]">{k.label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pipeline Funnel</CardTitle></CardHeader>
          <CardContent>
            {d.pipeline_by_stage.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={d.pipeline_by_stage.map((s) => ({ name: s.stage_name, value: Number(s.total_value) }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC8" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8B7355' }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#8B7355' }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2D6A4F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-[#5C4033]">No pipeline data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pipeline by Stage</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Stage</TH><TH className="text-right">Count</TH><TH className="text-right">Value</TH><TH className="text-right">Weighted</TH></TR></THead>
              <TBody>
                {d.pipeline_by_stage.map((s, i) => (
                  <TR key={i}>
                    <TD className="text-sm font-medium">{s.stage_name}</TD>
                    <TD className="text-right font-mono text-sm">{Number(s.count)}</TD>
                    <TD className="text-right font-mono text-sm">{formatCurrency(s.total_value)}</TD>
                    <TD className="text-right font-mono text-sm">{formatCurrency(s.weighted_value)}</TD>
                  </TR>
                ))}
                {!d.pipeline_by_stage.length && <TR><TD colSpan={4} className="text-center text-[#5C4033]">No opportunities yet</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
