// Earned Value Analysis — KPI cards + curve chart placeholder
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface EarnedValue {
  project_name: string; as_of: string;
  spi: number; cpi: number; eac: string; etc: string;
  bcwp: string; bcws: string; acwp: string;
  schedule_variance: string; cost_variance: string;
}

export default function EarnedValuePage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<EarnedValue | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get<EarnedValue>(`/projects/${id}/earned-value`)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!data) return <Shell><p className="text-[#E07A5F]">Earned value data not available</p></Shell>;

  const kpis = [
    { label: 'SPI (Schedule Performance)', value: data.spi.toFixed(2), good: data.spi >= 1 },
    { label: 'CPI (Cost Performance)', value: data.cpi.toFixed(2), good: data.cpi >= 1 },
    { label: 'EAC (Estimate at Completion)', value: formatCurrency(data.eac), good: true },
    { label: 'ETC (Estimate to Complete)', value: formatCurrency(data.etc), good: true },
  ];

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/projects/${id}`}><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-[#5C4033]">{data.project_name} - Earned Value</h1>
      </div>
      <p className="mb-4 text-sm text-[#8B7355]">As of {formatDate(data.as_of)}</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-[#E8DCC8]">
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-[#8B7355] mb-1">{kpi.label}</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-3xl font-bold text-[#5C4033]">{kpi.value}</p>
                {kpi.good ? <TrendingUp className="h-5 w-5 text-[#2D6A4F]" /> : <TrendingDown className="h-5 w-5 text-[#E07A5F]" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Earned Value Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between border-b border-[#E8DCC8] pb-2"><span className="text-sm text-[#8B7355]">BCWP (Earned Value)</span><span className="font-mono font-medium">{formatCurrency(data.bcwp)}</span></div>
            <div className="flex justify-between border-b border-[#E8DCC8] pb-2"><span className="text-sm text-[#8B7355]">BCWS (Planned Value)</span><span className="font-mono font-medium">{formatCurrency(data.bcws)}</span></div>
            <div className="flex justify-between border-b border-[#E8DCC8] pb-2"><span className="text-sm text-[#8B7355]">ACWP (Actual Cost)</span><span className="font-mono font-medium">{formatCurrency(data.acwp)}</span></div>
            <div className="flex justify-between border-b border-[#E8DCC8] pb-2">
              <span className="text-sm text-[#8B7355]">Schedule Variance</span>
              <span className={`font-mono font-medium ${Number(data.schedule_variance) >= 0 ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>{formatCurrency(data.schedule_variance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#8B7355]">Cost Variance</span>
              <span className={`font-mono font-medium ${Number(data.cost_variance) >= 0 ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>{formatCurrency(data.cost_variance)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Earned Value Curve</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center h-64 text-[#8B7355]">
            <div className="text-center">
              <p className="text-sm">S-curve chart</p>
              <p className="text-xs mt-1">BCWS / BCWP / ACWP over time</p>
              <p className="text-xs mt-2 text-[#D4A854]">Chart integration pending</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
