// Production Cost Report
'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Download } from 'lucide-react';

interface ProductionRow {
  wo_number: string; product_name: string; quantity: number;
  material_cost: number; labor_cost: number; overhead_cost: number;
  total_cost: number; variance: number;
}
interface ProductionReport { from: string; to: string; rows: ProductionRow[]; totals: ProductionRow }

export default function ProductionCostPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<ProductionReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!from || !to) return;
    setLoading(true);
    try { setData(await api.get<ProductionReport>(`/reports/production-cost?from=${from}&to=${to}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Production Cost Report</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <span className="text-[#8B7355]">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
          {data && (
            <Button size="sm" variant="outline" onClick={() => window.open(`/api/v1/reports/production-cost/export?from=${from}&to=${to}`, '_blank')}>
              <Download className="mr-2 h-4 w-4" />CSV
            </Button>
          )}
        </div>
      </div>
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">{data.from} to {data.to}</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead>
                <TR><TH>WO#</TH><TH>Product</TH><TH className="text-right">Qty</TH><TH className="text-right">Material</TH><TH className="text-right">Labor</TH><TH className="text-right">Overhead</TH><TH className="text-right">Total</TH><TH className="text-right">Variance</TH></TR>
              </THead>
              <TBody>
                {data.rows.map((r) => (
                  <TR key={r.wo_number}>
                    <TD className="font-mono text-sm">{r.wo_number}</TD>
                    <TD>{r.product_name}</TD>
                    <TD className="text-right font-mono">{r.quantity}</TD>
                    <TD className="text-right font-mono">{fmt(r.material_cost)}</TD>
                    <TD className="text-right font-mono">{fmt(r.labor_cost)}</TD>
                    <TD className="text-right font-mono">{fmt(r.overhead_cost)}</TD>
                    <TD className="text-right font-mono font-bold">{fmt(r.total_cost)}</TD>
                    <TD className={`text-right font-mono font-bold ${r.variance > 0 ? 'text-[#E07A5F]' : 'text-[#2D6A4F]'}`}>
                      {r.variance > 0 ? '+' : ''}{fmt(r.variance)}
                    </TD>
                  </TR>
                ))}
                {data.rows.length === 0 && <TR><TD colSpan={8} className="text-center text-[#8B7355]">No production data</TD></TR>}
                {data.rows.length > 0 && (
                  <TR className="border-t-2 bg-[#E8DCC8]/40 font-bold">
                    <TD colSpan={2}>Totals</TD>
                    <TD className="text-right font-mono">{data.totals.quantity}</TD>
                    <TD className="text-right font-mono">{fmt(data.totals.material_cost)}</TD>
                    <TD className="text-right font-mono">{fmt(data.totals.labor_cost)}</TD>
                    <TD className="text-right font-mono">{fmt(data.totals.overhead_cost)}</TD>
                    <TD className="text-right font-mono">{fmt(data.totals.total_cost)}</TD>
                    <TD className={`text-right font-mono ${data.totals.variance > 0 ? 'text-[#E07A5F]' : 'text-[#2D6A4F]'}`}>
                      {data.totals.variance > 0 ? '+' : ''}{fmt(data.totals.variance)}
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {!data && !loading && <p className="text-[#8B7355]">Select a date range and click Generate.</p>}
    </Shell>
  );
}
