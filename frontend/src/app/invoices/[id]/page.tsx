// Invoice detail page — view invoice, actions based on status
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Send, DollarSign, Ban, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency, formatDateTime } from '@/lib/format';

// Status colors
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#5C4033]',
  sent: 'bg-[#D4A854] text-[#5C4033]',
  paid: 'bg-[#2D6A4F] text-white',
  overdue: 'bg-[#E07A5F] text-white',
  voided: 'bg-[#8B7355] text-white',
};

interface InvoiceLine { id: number; description: string; quantity: string; unit_price: string; amount: string; account_id: number | null }
interface Invoice {
  id: number; invoice_number: string; customer_name: string; customer_email: string | null;
  customer_address: string | null; issue_date: string; due_date: string; status: string;
  subtotal: string; tax_rate: string; tax_amount: string; total: string; notes: string | null;
  paid_date: string | null; paid_amount: string; journal_entry_id: number | null;
  created_at: string; lines: InvoiceLine[];
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidAmount, setPaidAmount] = useState('');
  const [fiscalPeriodId, setFiscalPeriodId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Invoice>(`/invoices/${id}`);
      setInvoice(res);
      setPaidAmount(res.total);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const sendInvoice = async () => {
    setActionLoading(true); setError('');
    try {
      await api.post(`/invoices/${id}/send`);
      await load();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  const payInvoice = async () => {
    setActionLoading(true); setError('');
    try {
      await api.post(`/invoices/${id}/pay`, {
        paid_date: paidDate,
        paid_amount: parseFloat(paidAmount),
        fiscal_period_id: fiscalPeriodId ? parseInt(fiscalPeriodId, 10) : undefined,
      });
      setShowPayForm(false);
      await load();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  const voidInvoice = async () => {
    setActionLoading(true); setError('');
    try {
      await api.post(`/invoices/${id}/void`);
      await load();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!invoice) return <Shell><p className="text-[#E07A5F]">{error || 'Invoice not found'}</p></Shell>;

  return (
    <Shell>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/invoices"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-[#5C4033]">{invoice.invoice_number}</h1>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[invoice.status] || ''}`}>
            {invoice.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Actions based on status */}
          {invoice.status === 'draft' && (
            <Button onClick={sendInvoice} disabled={actionLoading}><Send className="mr-2 h-4 w-4" />Send</Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'draft') && (
            <Button variant="outline" onClick={() => setShowPayForm(!showPayForm)} disabled={actionLoading}>
              <DollarSign className="mr-2 h-4 w-4" />Mark as Paid
            </Button>
          )}
          {invoice.status !== 'voided' && (
            <Button variant="destructive" onClick={voidInvoice} disabled={actionLoading}>
              <Ban className="mr-2 h-4 w-4" />Void
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.open(`/api/v1/invoices/${id}/pdf`, '_blank')}>
            <Download className="mr-2 h-4 w-4" />PDF
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      {/* Pay form */}
      {showPayForm && (
        <Card className="mb-4 border-[#2D6A4F]/30 bg-[#2D6A4F]/5">
          <CardContent className="flex items-end gap-3 pt-4">
            <div>
              <label className="text-xs font-medium text-[#5C4033]">Paid Date</label>
              <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C4033]">Amount Paid</label>
              <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} step={0.01} className="w-36" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C4033]">Fiscal Period ID</label>
              <Input type="number" value={fiscalPeriodId} onChange={(e) => setFiscalPeriodId(e.target.value)} placeholder="Optional" className="w-32" />
            </div>
            <Button onClick={payInvoice} disabled={actionLoading}>{actionLoading ? 'Processing...' : 'Confirm Payment'}</Button>
            <Button variant="ghost" onClick={() => setShowPayForm(false)}>Cancel</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Invoice info */}
        <Card className="border-[#E8DCC8] lg:col-span-2">
          <CardHeader className="bg-[#E8DCC8]/30">
            <CardTitle className="text-[#5C4033]">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-[#8B7355]">Customer</p>
                <p className="font-medium text-[#5C4033]">{invoice.customer_name}</p>
                {invoice.customer_email && <p className="text-sm text-[#8B7355]">{invoice.customer_email}</p>}
                {invoice.customer_address && <p className="mt-1 text-sm text-[#8B7355] whitespace-pre-line">{invoice.customer_address}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-[#8B7355]">Issue Date</span><span className="text-sm font-medium">{formatDate(invoice.issue_date)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-[#8B7355]">Due Date</span><span className="text-sm font-medium">{formatDate(invoice.due_date)}</span></div>
                {invoice.paid_date && <div className="flex justify-between"><span className="text-sm text-[#8B7355]">Paid Date</span><span className="text-sm font-medium">{formatDate(invoice.paid_date)}</span></div>}
                {invoice.journal_entry_id && <div className="flex justify-between"><span className="text-sm text-[#8B7355]">Journal Entry</span><span className="text-sm font-medium">#{invoice.journal_entry_id}</span></div>}
              </div>
            </div>

            {/* Line items */}
            <div className="mt-6">
              <Table>
                <THead><TR><TH>Description</TH><TH className="text-right">Qty</TH><TH className="text-right">Unit Price</TH><TH className="text-right">Amount</TH></TR></THead>
                <TBody>
                  {invoice.lines.map((line) => (
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

            {/* Totals */}
            <div className="mt-4 border-t border-[#E8DCC8] pt-4">
              <div className="ml-auto w-64 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Subtotal</span><span className="font-mono">{formatCurrency(invoice.subtotal)}</span></div>
                {Number(invoice.tax_rate) > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Tax ({Number(invoice.tax_rate)}%)</span><span className="font-mono">{formatCurrency(invoice.tax_amount)}</span></div>
                )}
                <div className="flex justify-between border-t border-[#E8DCC8] pt-1 text-lg font-bold">
                  <span className="text-[#5C4033]">Total</span><span className="font-mono">{formatCurrency(invoice.total)}</span>
                </div>
                {Number(invoice.paid_amount) > 0 && (
                  <div className="flex justify-between text-sm text-[#2D6A4F]"><span>Paid</span><span className="font-mono">{formatCurrency(invoice.paid_amount)}</span></div>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-4 rounded-md bg-[#E8DCC8]/30 p-3">
                <p className="text-xs font-medium text-[#8B7355]">Notes</p>
                <p className="mt-1 text-sm text-[#5C4033]">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary sidebar */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#5C4033]">{formatCurrency(invoice.total)}</p>
              <p className="text-xs text-[#8B7355]">{invoice.lines.length} line item{invoice.lines.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-md bg-[#E8DCC8]/40 p-3 text-center">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[invoice.status] || ''}`}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-[#8B7355]">
              <p>Created: {formatDateTime(invoice.created_at)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
