'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface KPIs { total_pipeline_value: number; weighted_value: number; win_rate: number; avg_deal_size: number }
interface FunnelStage { name: string; count: number; value: number; color: string }
interface TopOpp { id: number; title: string; contact_name: string; value: number; stage_name: string; expected_close_date: string }
interface DashData { kpis: KPIs; funnel: FunnelStage[]; top_opportunities: TopOpp[] }

export default function CrmDashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashData>('/crm/dashboard').then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!data) return <Shell><p className="text-[#8B7355]">No data available</p></Shell>;

  const kpiCards = [
    { label: 'Pipeline Value', value: `$${data.kpis.total_pipeline_value.toLocaleString()}`, color: '#5C4033' },
    { label: 'Weighted Value', value: `$${data.kpis.weighted_value.toLocaleString()}`, color: '#2D6A4F' },
    { label: 'Win Rate', value: `${data.kpis.win_rate.toFixed(1)}%`, color: '#D4A854' },
    { label: 'Avg Deal Size', value: `$${data.kpis.avg_deal_size.toLocaleString()}`, color: '#8B7355' },
  ];

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">CRM Dashboard</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardHeader><CardTitle className="text-sm text-[#8B7355]">{k.label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pipeline Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.funnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC8" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8B7355' }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#8B7355' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2D6A4F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Opportunities</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Title</TH><TH>Contact</TH><TH className="text-right">Value</TH><TH>Stage</TH><TH>Close</TH></TR></THead>
              <TBody>
                {data.top_opportunities.map((o) => (
                  <TR key={o.id}>
                    <TD className="text-sm font-medium">{o.title}</TD>
                    <TD className="text-sm">{o.contact_name}</TD>
                    <TD className="text-right font-mono text-sm">${Number(o.value).toLocaleString()}</TD>
                    <TD className="text-sm">{o.stage_name}</TD>
                    <TD className="text-sm">{o.expected_close_date}</TD>
                  </TR>
                ))}
                {!data.top_opportunities.length && <TR><TD colSpan={5} className="text-center text-[#8B7355]">No opportunities</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
