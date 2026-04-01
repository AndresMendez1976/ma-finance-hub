// Credit Note detail page
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { ArrowLeft, Download, Send, CheckCircle, Ban } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#2C1810]', issued: 'bg-[#D4A854] text-[#2C1810]',
  applied: 'bg-[#2D6A4F] text-white', voided: 'bg-[#8B7355] text-white',
};

interface CreditNoteLine { id: number; description: string; quantity: string; unit_price: string; amount: string }
interface CreditNote {
  id: number; credit_note_number: string; customer_name: string; issue_date: string; reason: string;
  subtotal: string; tax_rate: string; tax_amount: string; total: string; status: string;
  notes: string | null; invoice_id: number | null; lines: CreditNoteLine[];
}

export default function CreditNoteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [cn, setCn] = useState<CreditNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCn(await api.get<CreditNote>(`/credit-notes/${id}`)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const doAction = async (action: string) => {
    setActionLoading(true); setError('');
    try { await api.post(`/credit-notes/${id}/${action}`); await load(); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <Shell><p className="text-[#5C4033]">Loading...</p></Shell>;
  if (!cn) return <Shell><p className="text-[#E07A5F]">{error || 'Credit note not found'}</p></Shell>;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/credit-notes"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-[#2C1810]">{cn.credit_note_number}</h1>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[cn.status] || ''}`}>{cn.status.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          {cn.status === 'draft' && <Button onClick={() => doAction('issue')} disabled={actionLoading}><Send className="mr-2 h-4 w-4" />Issue</Button>}
          {cn.status === 'issued' && <Button onClick={() => doAction('apply')} disabled={actionLoading}><CheckCircle className="mr-2 h-4 w-4" />Apply</Button>}
          {cn.status !== 'voided' && <Button variant="destructive" onClick={() => doAction('void')} disabled={actionLoading}><Ban className="mr-2 h-4 w-4" />Void</Button>}
          <Button size="sm" variant="outline" onClick={async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/credit-notes/${id}/pdf`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `credit-note-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}><Download className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#E8DCC8] lg:col-span-2">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#2C1810]">Credit Note Details</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div><p className="text-xs text-[#5C4033]">Customer</p><p className="font-medium text-[#2C1810]">{cn.customer_name}</p></div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-[#5C4033]">Issue Date</span><span className="text-sm font-medium">{formatDate(cn.issue_date)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-[#5C4033]">Reason</span><span className="text-sm font-medium">{cn.reason}</span></div>
                {cn.invoice_id && <div className="flex justify-between"><span className="text-sm text-[#5C4033]">Invoice</span><span className="text-sm font-medium">#{cn.invoice_id}</span></div>}
              </div>
            </div>
            <div className="mt-6">
              <Table>
                <THead><TR><TH>Description</TH><TH className="text-right">Qty</TH><TH className="text-right">Unit Price</TH><TH className="text-right">Amount</TH></TR></THead>
                <TBody>
                  {cn.lines.map((line) => (
                    <TR key={line.id}>
                      <TD>{line.description}</TD>
                      <TD className="text-right font-mono">{Number(line.quantity).toFixed(2)}</TD>
                      <TD className="text-right font-mono">{formatCurrency(line.unit_price)}</TD>
                      <TD className="text-right font-mono">{formatCurrency(line.amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <div className="mt-4 border-t border-[#E8DCC8] pt-4">
              <div className="ml-auto w-64 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-[#5C4033]">Subtotal</span><span className="font-mono">{formatCurrency(cn.subtotal)}</span></div>
                {Number(cn.tax_rate) > 0 && <div className="flex justify-between text-sm"><span className="text-[#5C4033]">Tax ({Number(cn.tax_rate)}%)</span><span className="font-mono">{formatCurrency(cn.tax_amount)}</span></div>}
                <div className="flex justify-between border-t border-[#E8DCC8] pt-1 text-lg font-bold"><span className="text-[#2C1810]">Total</span><span className="font-mono">{formatCurrency(cn.total)}</span></div>
              </div>
            </div>
            {cn.notes && <div className="mt-4 rounded-md bg-[#E8DCC8]/30 p-3"><p className="text-xs font-medium text-[#5C4033]">Notes</p><p className="mt-1 text-sm text-[#2C1810]">{cn.notes}</p></div>}
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#2C1810]">{formatCurrency(cn.total)}</p>
              <p className="text-xs text-[#5C4033]">{cn.lines.length} line item{cn.lines.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-md bg-[#E8DCC8]/40 p-3 text-center">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[cn.status] || ''}`}>{cn.status.toUpperCase()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
