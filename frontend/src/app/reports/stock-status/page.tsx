// Stock Status report — on hand vs reorder point, color-coded status
'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface StockRow { product_id: number; product_name: string; location_name: string; on_hand: number; reorder_point: number; status: string }
interface StockData { rows: StockRow[] }

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  ok: 'success', low: 'warning', out: 'destructive',
};

export default function StockStatusPage() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await api.get<StockData>('/reports/stock-status')); }
    catch { /* */ }
    finally { setLoading(false); }
  };

  const getStatus = (row: StockRow): string => {
    if (row.status) return row.status;
    if (row.on_hand <= 0) return 'out';
    if (row.reorder_point > 0 && row.on_hand <= row.reorder_point) return 'low';
    return 'ok';
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Stock Status</h1>
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
      </div>
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">Current Stock Status</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead><TR><TH>Product</TH><TH>Location</TH><TH className="text-right">On Hand</TH><TH className="text-right">Reorder Point</TH><TH>Status</TH></TR></THead>
              <TBody>
                {data.rows.map((r, i) => {
                  const status = getStatus(r);
                  return (
                    <TR key={`${r.product_id}-${r.location_name}-${i}`} className={status === 'out' ? 'bg-[#E07A5F]/10' : status === 'low' ? 'bg-[#D4A854]/10' : ''}>
                      <TD className="font-medium">{r.product_name}</TD>
                      <TD>{r.location_name}</TD>
                      <TD className="text-right font-mono">{r.on_hand}</TD>
                      <TD className="text-right font-mono">{r.reorder_point > 0 ? r.reorder_point : '—'}</TD>
                      <TD><Badge variant={STATUS_VARIANT[status] || 'success'}>{status.toUpperCase()}</Badge></TD>
                    </TR>
                  );
                })}
                {data.rows.length === 0 && <TR><TD colSpan={5} className="text-center text-[#8B7355]">No inventory items</TD></TR>}
              </TBody>
            </Table>
            {data.rows.length > 0 && (
              <div className="mt-4 flex gap-4 text-xs text-[#8B7355]">
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-[#2D6A4F]" />OK - Stock above reorder point</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-[#D4A854]" />Low - At or below reorder point</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-[#E07A5F]" />Out - Zero stock</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {!data && !loading && <p className="text-[#8B7355]">Click Generate to load the stock status report.</p>}
    </Shell>
  );
}
