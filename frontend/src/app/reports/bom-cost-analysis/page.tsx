// BOM Cost Analysis Report
'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api, extractArray } from '@/lib/api';
import { Download } from 'lucide-react';

interface BOMComponent { name: string; quantity: number; cost_per_unit: number; total: number }
interface BOMAnalysis {
  bom_id: number; bom_name: string; product_name: string; version: string;
  components: BOMComponent[]; material_total: number;
  labor_total: number; overhead_total: number; grand_total: number;
}

export default function BOMCostAnalysisPage() {
  const [data, setData] = useState<BOMAnalysis[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(extractArray(await api.get<unknown>('/reports/bom-cost-analysis'))); }
    catch { /* */ }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">BOM Cost Analysis</h1>
        <div className="flex gap-2">
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
          {data && (
            <Button size="sm" variant="outline" onClick={() => window.open('/api/v1/reports/bom-cost-analysis/export', '_blank')}>
              <Download className="mr-2 h-4 w-4" />CSV
            </Button>
          )}
        </div>
      </div>
      {data && data.map((bom) => (
        <Card key={bom.bom_id} className="mb-4 border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#2C1810]">{bom.bom_name} <span className="text-sm font-normal text-[#5C4033]">v{bom.version} - {bom.product_name}</span></CardTitle>
              <span className="text-lg font-bold font-mono text-[#2C1810]">{fmt(bom.grand_total)}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead><TR><TH>Component</TH><TH className="text-right">Qty</TH><TH className="text-right">Cost/Unit</TH><TH className="text-right">Total</TH></TR></THead>
              <TBody>
                {bom.components.map((c, i) => (
                  <TR key={i}>
                    <TD>{c.name}</TD><TD className="text-right font-mono">{c.quantity.toFixed(2)}</TD>
                    <TD className="text-right font-mono">{fmt(c.cost_per_unit)}</TD><TD className="text-right font-mono">{fmt(c.total)}</TD>
                  </TR>
                ))}
                {bom.components.length === 0 && <TR><TD colSpan={4} className="text-center text-[#5C4033]">No components</TD></TR>}
              </TBody>
            </Table>
            <div className="mt-4 flex justify-end gap-6 border-t border-[#E8DCC8] pt-3 text-sm">
              <span className="text-[#5C4033]">Material: <span className="font-mono font-medium">{fmt(bom.material_total)}</span></span>
              <span className="text-[#5C4033]">Labor: <span className="font-mono font-medium">{fmt(bom.labor_total)}</span></span>
              <span className="text-[#5C4033]">Overhead: <span className="font-mono font-medium">{fmt(bom.overhead_total)}</span></span>
              <span className="font-bold text-[#2C1810]">Total: <span className="font-mono">{fmt(bom.grand_total)}</span></span>
            </div>
          </CardContent>
        </Card>
      ))}
      {data && data.length === 0 && <p className="text-[#5C4033]">No BOMs found.</p>}
      {!data && !loading && <p className="text-[#5C4033]">Click Generate to load BOM cost analysis.</p>}
    </Shell>
  );
}
