'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Download } from 'lucide-react';

interface LineItem { name: string; amount: number }
interface CashFlow {
  period: { from: string; to: string };
  net_income: number;
  operating: { adjustments: LineItem[]; total: number };
  investing: { items: LineItem[]; total: number };
  financing: { items: LineItem[]; total: number };
  net_cash_change: number;
  total_from_activities: number;
}

export default function CashFlowPage() {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<CashFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get<CashFlow>(`/reports/cash-flow?from=${from}&to=${to}`);
      setData(res);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const renderItems = (items: LineItem[]) =>
    items.map((item, i) => (
      <TR key={i}><TD className="pl-6">{item.name}</TD><TD className="text-right font-mono">{item.amount.toFixed(2)}</TD></TR>
    ));

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Cash Flow Statement</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 border-[#D4C4A8]" />
          <span className="text-[#8B7355]">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 border-[#D4C4A8]" />
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
          {data && (
            <Button size="sm" variant="outline" onClick={() => window.open(`/api/v1/reports/cash-flow/export?from=${from}&to=${to}`, '_blank')}>
              <Download className="mr-2 h-4 w-4" />CSV
            </Button>
          )}
        </div>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/50">
            <CardTitle className="text-[#5C4033]">Cash Flow: {data.period.from} to {data.period.to}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead><TR><TH>Item</TH><TH className="text-right">Amount</TH></TR></THead>
              <TBody>
                {/* Operating Activities */}
                <TR className="bg-[#E8DCC8]/30"><TD colSpan={2} className="font-semibold text-[#5C4033]">Operating Activities</TD></TR>
                <TR><TD className="pl-6">Net Income</TD><TD className="text-right font-mono">{data.net_income.toFixed(2)}</TD></TR>
                {data.operating.adjustments.length > 0 && (
                  <TR className="bg-[#E8DCC8]/15"><TD colSpan={2} className="text-sm text-[#8B7355]">Adjustments:</TD></TR>
                )}
                {renderItems(data.operating.adjustments)}
                <TR className="border-t font-semibold"><TD>Cash from Operating</TD><TD className="text-right font-mono">{data.operating.total.toFixed(2)}</TD></TR>

                {/* Investing Activities */}
                <TR className="bg-[#E8DCC8]/30"><TD colSpan={2} className="font-semibold text-[#5C4033]">Investing Activities</TD></TR>
                {data.investing.items.length > 0 ? renderItems(data.investing.items) : (
                  <TR><TD className="pl-6 text-[#8B7355]">No investing activity</TD><TD></TD></TR>
                )}
                <TR className="border-t font-semibold"><TD>Cash from Investing</TD><TD className="text-right font-mono">{data.investing.total.toFixed(2)}</TD></TR>

                {/* Financing Activities */}
                <TR className="bg-[#E8DCC8]/30"><TD colSpan={2} className="font-semibold text-[#5C4033]">Financing Activities</TD></TR>
                {data.financing.items.length > 0 ? renderItems(data.financing.items) : (
                  <TR><TD className="pl-6 text-[#8B7355]">No financing activity</TD><TD></TD></TR>
                )}
                <TR className="border-t font-semibold"><TD>Cash from Financing</TD><TD className="text-right font-mono">{data.financing.total.toFixed(2)}</TD></TR>

                {/* Totals */}
                <TR className="border-t-2 bg-[#2D6A4F]/10 text-lg font-bold">
                  <TD>Net Change in Cash</TD>
                  <TD className="text-right font-mono">{data.net_cash_change.toFixed(2)}</TD>
                </TR>
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {!data && !loading && <p className="text-[#8B7355]">Select a date range and click Generate.</p>}
      <p className="mt-6 text-center text-xs text-[#8B7355]">
        Financial reports are generated based on data entered by the user. These reports have not been audited by a CPA.
      </p>
    </Shell>
  );
}
