// Aged Payables report — expenses aging by vendor
'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Download } from 'lucide-react';

interface AgingRow { vendor: string; current: number; d31_60: number; d61_90: number; d90plus: number; total: number }
interface AgedData { as_of: string; rows: AgingRow[]; totals: { current: number; d31_60: number; d61_90: number; d90plus: number; total: number } }

export default function AgedPayablesPage() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<AgedData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await api.get<AgedData>(`/reports/aged-payables?as_of=${asOf}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Aged Payables</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
          {data && <Button size="sm" variant="outline" onClick={() => window.open(`/api/v1/reports/aged-payables/export?as_of=${asOf}`, '_blank')}><Download className="mr-2 h-4 w-4" />CSV</Button>}
        </div>
      </div>
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">As of {data.as_of}</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead>
                <TR>
                  <TH>Vendor</TH>
                  <TH className="text-right" style={{ color: '#2D6A4F' }}>Current (0-30)</TH>
                  <TH className="text-right" style={{ color: '#D4A854' }}>31-60</TH>
                  <TH className="text-right" style={{ color: '#E07A5F' }}>61-90</TH>
                  <TH className="text-right" style={{ color: '#CC0000' }}>90+</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {data.rows.map((r) => (
                  <TR key={r.vendor}>
                    <TD className="font-medium">{r.vendor}</TD>
                    <TD className="text-right font-mono">{r.current > 0 ? `$${r.current.toFixed(2)}` : '-'}</TD>
                    <TD className="text-right font-mono">{r.d31_60 > 0 ? `$${r.d31_60.toFixed(2)}` : '-'}</TD>
                    <TD className="text-right font-mono">{r.d61_90 > 0 ? `$${r.d61_90.toFixed(2)}` : '-'}</TD>
                    <TD className="text-right font-mono">{r.d90plus > 0 ? `$${r.d90plus.toFixed(2)}` : '-'}</TD>
                    <TD className="text-right font-mono font-bold">${r.total.toFixed(2)}</TD>
                  </TR>
                ))}
                {data.rows.length === 0 && <TR><TD colSpan={6} className="text-center text-[#8B7355]">No outstanding payables</TD></TR>}
                {data.rows.length > 0 && (
                  <TR className="border-t-2 bg-[#E8DCC8]/40 font-bold">
                    <TD>Total</TD>
                    <TD className="text-right font-mono">${data.totals.current.toFixed(2)}</TD>
                    <TD className="text-right font-mono">${data.totals.d31_60.toFixed(2)}</TD>
                    <TD className="text-right font-mono">${data.totals.d61_90.toFixed(2)}</TD>
                    <TD className="text-right font-mono">${data.totals.d90plus.toFixed(2)}</TD>
                    <TD className="text-right font-mono">${data.totals.total.toFixed(2)}</TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {!data && !loading && <p className="text-[#8B7355]">Select a date and click Generate.</p>}
    </Shell>
  );
}
