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

interface Account { account_code: string; account_name: string; amount: number }
interface Group { category: string; accounts: Account[]; total: number }
interface Section { groups: Group[]; total: number }
interface BalanceSheet {
  as_of: string;
  assets: Section;
  liabilities: Section;
  equity: Section;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
}

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get<BalanceSheet>(`/reports/balance-sheet?as_of=${asOf}`);
      setData(res);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const renderSection = (title: string, section: Section) => (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="bg-[#E8DCC8]/50"><CardTitle className="text-[#2C1810]">{title}</CardTitle></CardHeader>
      <CardContent className="pt-4">
        <Table>
          <THead><TR><TH>Code</TH><TH>Account</TH><TH className="text-right">Amount</TH></TR></THead>
          <TBody>
            {section.groups.map((g) => (
              <>
                <TR key={g.category} className="bg-[#E8DCC8]/30"><TD colSpan={2} className="font-semibold text-[#2C1810]">{g.category}</TD><TD></TD></TR>
                {g.accounts.map((a) => (
                  <TR key={a.account_code}><TD className="pl-6 font-mono text-sm">{a.account_code}</TD><TD>{a.account_name}</TD><TD className="text-right font-mono">{a.amount.toFixed(2)}</TD></TR>
                ))}
                <TR className="border-t"><TD colSpan={2} className="font-medium text-[#5C4033]">{g.category} Subtotal</TD><TD className="text-right font-mono font-semibold">{g.total.toFixed(2)}</TD></TR>
              </>
            ))}
            <TR className="border-t-2 bg-[#E8DCC8]/40 font-bold"><TD colSpan={2}>Total {title}</TD><TD className="text-right font-mono">{section.total.toFixed(2)}</TD></TR>
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Balance Sheet</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44 border-[#D4C4A8]" />
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
          {data && (
            <>
              <Button size="sm" variant="outline" onClick={() => window.open(`/api/v1/reports/balance-sheet/export?as_of=${asOf}`, '_blank')}>
                <Download className="mr-2 h-4 w-4" />CSV
              </Button>
              <Button className="no-print" variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />Print
              </Button>
            </>
          )}
        </div>
      </div>
      <ReportHeader title="Balance Sheet" asOf={asOf} />
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      {data && (
        <div className="space-y-4">
          {renderSection('Assets', data.assets)}
          {renderSection('Liabilities', data.liabilities)}
          {renderSection('Equity', data.equity)}
          <Card className="border-[#E8DCC8]">
            <CardContent className="flex items-center justify-between py-4">
              <span className="text-lg font-bold text-[#2C1810]">Total Liabilities & Equity</span>
              <span className="text-lg font-bold font-mono">{data.total_liabilities_and_equity.toFixed(2)}</span>
            </CardContent>
          </Card>
          <div className={`rounded-md p-3 text-center text-sm font-medium ${data.is_balanced ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]' : 'bg-[#E07A5F]/10 text-[#E07A5F]'}`}>
            {data.is_balanced ? 'Balance Sheet is balanced (Assets = Liabilities + Equity)' : 'WARNING: Balance Sheet is NOT balanced'}
          </div>
        </div>
      )}
      {!data && !loading && <p className="text-[#5C4033]">Select an as-of date and click Generate.</p>}
      <p className="mt-6 text-center text-xs text-[#5C4033]">
        Financial reports are generated based on data entered by the user. These reports have not been audited by a CPA.
      </p>
    </Shell>
  );
}
