// Unit Price Summary Report — unit price items with quantities and amounts
'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

interface UnitPriceLine {
  project_name: string; cost_code: string; description: string; unit: string;
  est_quantity: number; actual_quantity: number; unit_price: string;
  est_amount: string; actual_amount: string; variance: string;
}
interface UnitPriceReport { data: UnitPriceLine[]; totals: { est_total: string; actual_total: string; variance: string } }

export default function UnitPriceSummaryPage() {
  const [data, setData] = useState<UnitPriceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set('project_id', projectId);
      setData(await api.get<UnitPriceReport>(`/reports/unit-price-summary?${params}`));
    } catch { /* */ }
    finally { setLoading(false); }
  }, [projectId]);

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">Unit Price Summary</h1>
      <div className="mb-4 flex gap-3 items-end">
        <div><label className="text-xs font-medium text-[#2C1810]">Project ID</label><Input value={projectId} onChange={(e) => setProjectId(e.target.value)} type="number" className="w-28" /></div>
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Run Report'}</Button>
      </div>
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#2C1810]">Unit Price Items — {formatDate(new Date().toISOString())}</CardTitle></CardHeader>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <THead>
                <TR><TH>Project</TH><TH>Cost Code</TH><TH>Description</TH><TH>Unit</TH><TH className="text-right">Est. Qty</TH><TH className="text-right">Actual Qty</TH><TH className="text-right">Unit Price</TH><TH className="text-right">Est. Amount</TH><TH className="text-right">Actual Amount</TH><TH className="text-right">Variance</TH></TR>
              </THead>
              <TBody>
                {data.data.map((d, i) => (
                  <TR key={i}>
                    <TD className="font-medium">{d.project_name}</TD>
                    <TD className="font-mono text-sm">{d.cost_code}</TD>
                    <TD>{d.description}</TD>
                    <TD className="text-sm text-[#5C4033]">{d.unit}</TD>
                    <TD className="text-right font-mono">{d.est_quantity.toLocaleString()}</TD>
                    <TD className="text-right font-mono">{d.actual_quantity.toLocaleString()}</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.unit_price)}</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.est_amount)}</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.actual_amount)}</TD>
                    <TD className={`text-right font-mono ${Number(d.variance) >= 0 ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>{formatCurrency(d.variance)}</TD>
                  </TR>
                ))}
                {!data.data.length && <TR><TD colSpan={10} className="text-center text-[#5C4033]">No data</TD></TR>}
              </TBody>
            </Table>
            <div className="mt-4 border-t border-[#E8DCC8] pt-3 flex justify-end gap-8 font-bold text-sm">
              <span>Est: <span className="font-mono">{formatCurrency(data.totals.est_total)}</span></span>
              <span>Actual: <span className="font-mono">{formatCurrency(data.totals.actual_total)}</span></span>
              <span className={Number(data.totals.variance) >= 0 ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}>Var: <span className="font-mono">{formatCurrency(data.totals.variance)}</span></span>
            </div>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
