// Mileage Summary Report — by period with total miles + deduction
'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

interface MileagePeriod { period: string; trip_count: number; total_miles: number; avg_rate: string; total_deduction: string }
interface MileageSummary { data: MileagePeriod[]; totals: { total_trips: number; total_miles: number; total_deduction: string } }

export default function MileageSummaryPage() {
  const [data, setData] = useState<MileageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get<MileageSummary>(`/reports/mileage-summary?year=${year}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [year]);

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">Mileage Summary</h1>
      <div className="mb-4 flex gap-3 items-end">
        <div><label className="text-xs font-medium text-[#5C4033]">Year</label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" /></div>
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Run Report'}</Button>
      </div>
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="border-[#E8DCC8]">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-[#8B7355]">Total Trips</p>
                <p className="text-3xl font-bold text-[#5C4033]">{data.totals.total_trips}</p>
              </CardContent>
            </Card>
            <Card className="border-[#E8DCC8]">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-[#8B7355]">Total Miles</p>
                <p className="text-3xl font-bold text-[#5C4033]">{data.totals.total_miles.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-[#E8DCC8]">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-[#8B7355]">Total Deduction</p>
                <p className="text-3xl font-bold text-[#2D6A4F]">{formatCurrency(data.totals.total_deduction)}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="border-[#E8DCC8]">
            <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">Monthly Breakdown — {year}</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <Table>
                <THead><TR><TH>Period</TH><TH className="text-right">Trips</TH><TH className="text-right">Miles</TH><TH className="text-right">Avg Rate</TH><TH className="text-right">Deduction</TH></TR></THead>
                <TBody>
                  {data.data.map((p, i) => (
                    <TR key={i}>
                      <TD className="font-medium">{p.period}</TD>
                      <TD className="text-right font-mono">{p.trip_count}</TD>
                      <TD className="text-right font-mono">{p.total_miles.toLocaleString()}</TD>
                      <TD className="text-right font-mono">{formatCurrency(p.avg_rate)}/mi</TD>
                      <TD className="text-right font-mono font-medium">{formatCurrency(p.total_deduction)}</TD>
                    </TR>
                  ))}
                  {!data.data.length && <TR><TD colSpan={5} className="text-center text-[#8B7355]">No mileage data</TD></TR>}
                </TBody>
              </Table>
              <p className="mt-4 text-xs text-[#8B7355]">Report generated: {formatDate(new Date().toISOString())}</p>
            </CardContent>
          </Card>
        </>
      )}
    </Shell>
  );
}
