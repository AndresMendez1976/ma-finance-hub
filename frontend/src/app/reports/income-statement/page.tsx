'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Download } from 'lucide-react';

interface Account { account_code: string; account_name: string; amount: number }
interface Group { category: string; accounts: Account[]; total: number }
interface Section { groups: Group[]; total: number }
interface IncomeStatement {
  period: { from: string; to: string };
  revenue: Section;
  cost_of_goods_sold: Section;
  gross_profit: number;
  operating_expenses: Section;
  operating_income: number;
  other_expenses: Section;
  net_income: number;
}

export default function IncomeStatementPage() {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get<IncomeStatement>(`/reports/income-statement?from=${from}&to=${to}`);
      setData(res);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const renderGroup = (section: Section, label: string) => (
    <>
      {section.groups.map((g) => (
        <div key={g.category}>
          <TR className="bg-[#E8DCC8]/30"><TD colSpan={2} className="font-semibold text-[#5C4033]">{g.category}</TD><TD></TD></TR>
          {g.accounts.map((a) => (
            <TR key={a.account_code}><TD className="pl-6 font-mono text-sm">{a.account_code}</TD><TD>{a.account_name}</TD><TD className="text-right font-mono">{a.amount.toFixed(2)}</TD></TR>
          ))}
        </div>
      ))}
      <TR className="border-t font-semibold"><TD colSpan={2}>Total {label}</TD><TD className="text-right font-mono">{section.total.toFixed(2)}</TD></TR>
    </>
  );

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Income Statement</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 border-[#D4C4A8]" />
          <span className="text-[#8B7355]">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 border-[#D4C4A8]" />
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
          {data && (
            <Button size="sm" variant="outline" onClick={() => window.open(`/api/v1/reports/income-statement/export?from=${from}&to=${to}`, '_blank')}>
              <Download className="mr-2 h-4 w-4" />CSV
            </Button>
          )}
        </div>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/50">
            <CardTitle className="text-[#5C4033]">Profit & Loss: {data.period.from} to {data.period.to}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead><TR><TH>Code</TH><TH>Account</TH><TH className="text-right">Amount</TH></TR></THead>
              <TBody>
                {renderGroup(data.revenue, 'Revenue')}
                {renderGroup(data.cost_of_goods_sold, 'Cost of Goods Sold')}
                <TR className="border-t-2 bg-[#2D6A4F]/5 font-bold"><TD colSpan={2}>Gross Profit</TD><TD className="text-right font-mono">{data.gross_profit.toFixed(2)}</TD></TR>
                {renderGroup(data.operating_expenses, 'Operating Expenses')}
                <TR className="border-t-2 bg-[#2D6A4F]/5 font-bold"><TD colSpan={2}>Operating Income</TD><TD className="text-right font-mono">{data.operating_income.toFixed(2)}</TD></TR>
                {renderGroup(data.other_expenses, 'Other Expenses')}
                <TR className="border-t-2 bg-[#2D6A4F]/10 text-lg font-bold"><TD colSpan={2}>Net Income</TD><TD className="text-right font-mono">{data.net_income.toFixed(2)}</TD></TR>
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {!data && !loading && <p className="text-[#8B7355]">Select a date range and click Generate.</p>}
    </Shell>
  );
}
