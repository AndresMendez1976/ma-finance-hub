// Aged Receivables report — invoices aging by customer
'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Download, Printer } from 'lucide-react';
import { ReportHeader } from '@/components/report-header';

interface AgingRow { customer: string; current: number; d31_60: number; d61_90: number; d90plus: number; total: number }
interface AgedData { as_of: string; rows: AgingRow[]; totals: { current: number; d31_60: number; d61_90: number; d90plus: number; total: number } }

export default function AgedReceivablesPage() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<AgedData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await api.get<AgedData>(`/reports/aged-receivables?as_of=${asOf}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Aged Receivables</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
          {data && (
            <>
              <Button size="sm" variant="outline" onClick={() => window.open(`/api/v1/reports/aged-receivables/export?as_of=${asOf}`, '_blank')}><Download className="mr-2 h-4 w-4" />CSV</Button>
              <Button className="no-print" variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
            </>
          )}
        </div>
      </div>
      <ReportHeader title="Aged Receivables" asOf={asOf} />
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#2C1810]">As of {data.as_of}</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead>
                <TR>
                  <TH>Customer</TH>
                  <TH className="text-right" style={{ color: '#2D6A4F' }}>Current (0-30)</TH>
                  <TH className="text-right" style={{ color: '#D4A854' }}>31-60</TH>
                  <TH className="text-right" style={{ color: '#E07A5F' }}>61-90</TH>
                  <TH className="text-right" style={{ color: '#CC0000' }}>90+</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {data.rows.map((r) => (
                  <TR key={r.customer}>
                    <TD className="font-medium">{r.customer}</TD>
                    <TD className="text-right font-mono">{r.current > 0 ? `$${r.current.toFixed(2)}` : '-'}</TD>
                    <TD className="text-right font-mono">{r.d31_60 > 0 ? `$${r.d31_60.toFixed(2)}` : '-'}</TD>
                    <TD className="text-right font-mono">{r.d61_90 > 0 ? `$${r.d61_90.toFixed(2)}` : '-'}</TD>
                    <TD className="text-right font-mono">{r.d90plus > 0 ? `$${r.d90plus.toFixed(2)}` : '-'}</TD>
                    <TD className="text-right font-mono font-bold">${r.total.toFixed(2)}</TD>
                  </TR>
                ))}
                {data.rows.length === 0 && <TR><TD colSpan={6} className="text-center text-[#5C4033]">No outstanding receivables</TD></TR>}
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
      {!data && !loading && <p className="text-[#5C4033]">Select a date and click Generate.</p>}
    </Shell>
  );
}
