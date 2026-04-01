// WIP Schedule Report — contract, cost to date, estimated total, profit, % complete
'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

interface WipLine {
  project_name: string; contract_amount: string; cost_to_date: string;
  est_total_cost: string; est_profit: string; pct_complete: number;
  earned_revenue: string; billed_to_date: string; over_under: string;
}
interface WipReport { as_of: string; data: WipLine[] }

export default function WipSchedulePage() {
  const [data, setData] = useState<WipReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get<WipReport>(`/reports/wip?as_of=${asOf}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [asOf]);

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">WIP Schedule</h1>
      <div className="mb-4 flex gap-3 items-end">
        <div><label className="text-xs font-medium text-[#5C4033]">As of Date</label><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-40" /></div>
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Run Report'}</Button>
      </div>
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">Work in Progress — {formatDate(data.as_of)}</CardTitle></CardHeader>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Project</TH><TH className="text-right">Contract</TH><TH className="text-right">Cost to Date</TH>
                  <TH className="text-right">Est. Total Cost</TH><TH className="text-right">Est. Profit</TH><TH className="text-right">% Complete</TH>
                  <TH className="text-right">Earned Revenue</TH><TH className="text-right">Billed</TH><TH className="text-right">Over/(Under)</TH>
                </TR>
              </THead>
              <TBody>
                {data.data.map((d, i) => (
                  <TR key={i}>
                    <TD className="font-medium">{d.project_name}</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.contract_amount)}</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.cost_to_date)}</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.est_total_cost)}</TD>
                    <TD className={`text-right font-mono ${Number(d.est_profit) >= 0 ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>{formatCurrency(d.est_profit)}</TD>
                    <TD className="text-right font-mono">{d.pct_complete}%</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.earned_revenue)}</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.billed_to_date)}</TD>
                    <TD className={`text-right font-mono font-medium ${Number(d.over_under) >= 0 ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>{formatCurrency(d.over_under)}</TD>
                  </TR>
                ))}
                {!data.data.length && <TR><TD colSpan={9} className="text-center text-[#8B7355]">No WIP data</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
