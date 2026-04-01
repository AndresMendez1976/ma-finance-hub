// Bill detail page with payment history and actions
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { ArrowLeft, Package, CheckCircle, DollarSign, Ban } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#2C1810]', received: 'bg-[#D4A854] text-[#2C1810]',
  approved: 'bg-[#2D6A4F]/70 text-white', paid: 'bg-[#2D6A4F] text-white',
  overdue: 'bg-[#E07A5F] text-white', voided: 'bg-[#8B7355] text-white',
};

interface BillLine { id: number; description: string; quantity: string; unit_price: string; amount: string }
interface Payment { id: number; paid_date: string; amount: string; method: string }
interface Bill {
  id: number; bill_number: string; vendor_name: string; vendor_ref: string | null;
  bill_date: string; due_date: string; subtotal: string; tax_amount: string; total: string;
  amount_paid: string; balance: string; status: string; notes: string | null;
  lines: BillLine[]; payments: Payment[];
}

export default function BillDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('check');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get<Bill>(`/bills/${id}`); setBill(res); setPayAmount(res.balance); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const doAction = async (action: string, body?: unknown) => {
    setActionLoading(true); setError('');
    try { await api.post(`/bills/${id}/${action}`, body); setShowPayForm(false); await load(); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <Shell><p className="text-[#5C4033]">Loading...</p></Shell>;
  if (!bill) return <Shell><p className="text-[#E07A5F]">{error || 'Bill not found'}</p></Shell>;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/bills"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-[#2C1810]">{bill.bill_number}</h1>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[bill.status] || ''}`}>{bill.status.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          {bill.status === 'draft' && <Button onClick={() => doAction('receive')} disabled={actionLoading}><Package className="mr-2 h-4 w-4" />Receive</Button>}
          {bill.status === 'received' && <Button onClick={() => doAction('approve')} disabled={actionLoading}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>}
          {(bill.status === 'approved' || bill.status === 'received') && <Button variant="outline" onClick={() => setShowPayForm(!showPayForm)}><DollarSign className="mr-2 h-4 w-4" />Pay</Button>}
          {bill.status !== 'voided' && bill.status !== 'paid' && <Button variant="destructive" onClick={() => doAction('void')} disabled={actionLoading}><Ban className="mr-2 h-4 w-4" />Void</Button>}
        </div>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      {showPayForm && (
        <Card className="mb-4 border-[#2D6A4F]/30 bg-[#2D6A4F]/5">
          <CardContent className="flex items-end gap-3 pt-4">
            <div><label className="text-xs font-medium text-[#2C1810]">Payment Date</label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-40" /></div>
            <div><label className="text-xs font-medium text-[#2C1810]">Amount</label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} step="0.01" className="w-36" /></div>
            <div><label className="text-xs font-medium text-[#2C1810]">Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm">
                <option value="check">Check</option><option value="ach">ACH</option><option value="wire">Wire</option><option value="card">Card</option>
              </select>
            </div>
            <Button onClick={() => doAction('pay', { paid_date: payDate, amount: parseFloat(payAmount), method: payMethod })} disabled={actionLoading}>{actionLoading ? 'Processing...' : 'Confirm'}</Button>
            <Button variant="ghost" onClick={() => setShowPayForm(false)}>Cancel</Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#E8DCC8] lg:col-span-2">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#2C1810]">Bill Details</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div><p className="text-xs text-[#5C4033]">Vendor</p><p className="font-medium text-[#2C1810]">{bill.vendor_name}</p>{bill.vendor_ref && <p className="text-sm text-[#5C4033]">Ref: {bill.vendor_ref}</p>}</div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-[#5C4033]">Bill Date</span><span className="text-sm font-medium">{formatDate(bill.bill_date)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-[#5C4033]">Due Date</span><span className="text-sm font-medium">{formatDate(bill.due_date)}</span></div>
              </div>
            </div>
            <Table>
              <THead><TR><TH>Description</TH><TH className="text-right">Qty</TH><TH className="text-right">Price</TH><TH className="text-right">Amount</TH></TR></THead>
              <TBody>{bill.lines.map((l) => (<TR key={l.id}><TD>{l.description}</TD><TD className="text-right font-mono">{Number(l.quantity).toFixed(2)}</TD><TD className="text-right font-mono">{formatCurrency(l.unit_price)}</TD><TD className="text-right font-mono">{formatCurrency(l.amount)}</TD></TR>))}</TBody>
            </Table>
            <div className="mt-4 border-t border-[#E8DCC8] pt-4 ml-auto w-64 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-[#5C4033]">Subtotal</span><span className="font-mono">{formatCurrency(bill.subtotal)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t border-[#E8DCC8] pt-1"><span>Total</span><span className="font-mono">{formatCurrency(bill.total)}</span></div>
              <div className="flex justify-between text-sm text-[#2D6A4F]"><span>Paid</span><span className="font-mono">{formatCurrency(bill.amount_paid)}</span></div>
              <div className="flex justify-between text-sm font-bold"><span>Balance</span><span className="font-mono">{formatCurrency(bill.balance)}</span></div>
            </div>
            {bill.notes && <div className="mt-4 rounded-md bg-[#E8DCC8]/30 p-3"><p className="text-xs font-medium text-[#5C4033]">Notes</p><p className="mt-1 text-sm">{bill.notes}</p></div>}
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Payment History</CardTitle></CardHeader>
          <CardContent>
            {bill.payments?.length ? bill.payments.map((p) => (
              <div key={p.id} className="flex justify-between border-b border-[#E8DCC8] py-2 last:border-0">
                <div><p className="text-sm font-medium">{formatDate(p.paid_date)}</p><p className="text-xs text-[#5C4033]">{p.method}</p></div>
                <p className="font-mono font-medium text-[#2D6A4F]">{formatCurrency(p.amount)}</p>
              </div>
            )) : <p className="text-sm text-[#5C4033]">No payments yet</p>}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
