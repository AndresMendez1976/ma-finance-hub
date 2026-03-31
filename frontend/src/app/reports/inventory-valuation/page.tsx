// Inventory Valuation report — product valuations with CSV export
'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Download } from 'lucide-react';

interface ValuationRow { product_id: number; product_name: string; sku: string; costing_method: string; quantity: number; unit_cost: number; total_value: number }
interface ValuationData { as_of: string; rows: ValuationRow[]; total_value: number }

export default function InventoryValuationPage() {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await api.get<ValuationData>('/reports/inventory-valuation')); }
    catch { /* */ }
    finally { setLoading(false); }
  };

  const exportCsv = () => {
    if (!data) return;
    const header = 'Product,SKU,Costing Method,Quantity,Unit Cost,Total Value\n';
    const rows = data.rows.map(r => `"${r.product_name}","${r.sku}","${r.costing_method}",${r.quantity},${r.unit_cost.toFixed(2)},${r.total_value.toFixed(2)}`).join('\n');
    const blob = new Blob([header + rows + `\n\nTotal,,,,,$${data.total_value.toFixed(2)}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'inventory-valuation.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Inventory Valuation</h1>
        <div className="flex items-center gap-2">
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
          {data && <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />CSV</Button>}
        </div>
      </div>
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">As of {data.as_of}</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead><TR><TH>Product</TH><TH>SKU</TH><TH>Costing Method</TH><TH className="text-right">Quantity</TH><TH className="text-right">Unit Cost</TH><TH className="text-right">Total Value</TH></TR></THead>
              <TBody>
                {data.rows.map((r) => (
                  <TR key={r.product_id}>
                    <TD className="font-medium">{r.product_name}</TD>
                    <TD className="font-mono text-sm">{r.sku}</TD>
                    <TD className="uppercase text-sm">{r.costing_method}</TD>
                    <TD className="text-right font-mono">{r.quantity}</TD>
                    <TD className="text-right font-mono">${r.unit_cost.toFixed(2)}</TD>
                    <TD className="text-right font-mono">${r.total_value.toFixed(2)}</TD>
                  </TR>
                ))}
                {data.rows.length === 0 && <TR><TD colSpan={6} className="text-center text-[#8B7355]">No inventory items</TD></TR>}
                {data.rows.length > 0 && (
                  <TR className="border-t-2 bg-[#E8DCC8]/40 font-bold">
                    <TD colSpan={5}>Total</TD>
                    <TD className="text-right font-mono">${data.total_value.toFixed(2)}</TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {!data && !loading && <p className="text-[#8B7355]">Click Generate to load the inventory valuation report.</p>}
    </Shell>
  );
}
