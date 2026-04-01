// Contact Statement — transaction list with running balance
'use client';
import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { ArrowLeft, Printer } from 'lucide-react';
import { ReportHeader } from '@/components/report-header';
import Link from 'next/link';

interface Transaction {
  type: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
}

interface StatementData {
  contact: {
    id: number;
    first_name: string;
    last_name: string | null;
    company_name: string | null;
    type: string;
  };
  from: string | null;
  to: string | null;
  transactions: Transaction[];
  totals: { debit: number; credit: number; balance: number };
}

const TYPE_VARIANT: Record<string, 'info' | 'success' | 'warning'> = {
  invoice: 'info',
  payment: 'success',
  credit_note: 'warning',
};

export default function ContactStatementPage() {
  const params = useParams();
  const id = params.id as string;
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get<StatementData>(`/contacts/${id}/statement?${params.toString()}`);
      setData(res);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id, from, to]);

  const contactName = data
    ? (data.contact.company_name || `${data.contact.first_name} ${data.contact.last_name || ''}`.trim())
    : '';

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/contacts/${id}`}>
          <Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#2C1810]">
          Statement{contactName ? `: ${contactName}` : ''}
        </h1>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 border-[#D4C4A8]" />
        <span className="text-[#5C4033]">to</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 border-[#D4C4A8]" />
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
        {data && (
          <Button className="no-print" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />Print
          </Button>
        )}
      </div>

      <ReportHeader
        title={`Statement — ${contactName}`}
        dateRange={from && to ? `${from} to ${to}` : undefined}
      />

      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#2C1810]">
                {contactName}
              </CardTitle>
              <span className="text-sm text-[#5C4033]">
                {data.from && data.to ? `${formatDate(data.from)} - ${formatDate(data.to)}` : 'All time'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Type</TH>
                  <TH>Reference</TH>
                  <TH>Description</TH>
                  <TH className="text-right">Debit</TH>
                  <TH className="text-right">Credit</TH>
                  <TH className="text-right">Balance</TH>
                </TR>
              </THead>
              <TBody>
                {data.transactions.map((txn, i) => (
                  <TR key={`${txn.reference}-${i}`}>
                    <TD className="text-sm">{formatDate(txn.date)}</TD>
                    <TD>
                      <Badge variant={TYPE_VARIANT[txn.type] || 'info'} className="text-xs">
                        {txn.type.replace('_', ' ')}
                      </Badge>
                    </TD>
                    <TD className="font-mono text-sm">{txn.reference}</TD>
                    <TD>{txn.description}</TD>
                    <TD className="text-right font-mono">{txn.debit > 0 ? formatCurrency(txn.debit) : ''}</TD>
                    <TD className="text-right font-mono">{txn.credit > 0 ? formatCurrency(txn.credit) : ''}</TD>
                    <TD className={`text-right font-mono font-semibold ${txn.balance > 0 ? 'text-[#E07A5F]' : txn.balance < 0 ? 'text-[#2D6A4F]' : ''}`}>
                      {formatCurrency(txn.balance)}
                    </TD>
                  </TR>
                ))}
                {data.transactions.length === 0 && (
                  <TR><TD colSpan={7} className="text-center text-[#5C4033]">No transactions found for this period</TD></TR>
                )}
                {data.transactions.length > 0 && (
                  <TR className="border-t-2 bg-[#E8DCC8]/40 font-bold">
                    <TD colSpan={4}>Totals</TD>
                    <TD className="text-right font-mono">{formatCurrency(data.totals.debit)}</TD>
                    <TD className="text-right font-mono">{formatCurrency(data.totals.credit)}</TD>
                    <TD className={`text-right font-mono ${data.totals.balance > 0 ? 'text-[#E07A5F]' : 'text-[#2D6A4F]'}`}>
                      {formatCurrency(data.totals.balance)}
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!data && !loading && <p className="text-[#5C4033]">Select a date range and click Generate to view the statement.</p>}
    </Shell>
  );
}
