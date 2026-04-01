// Purchase Order detail page — actions based on status, receipt tracking
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { ArrowLeft, Check, Send, Package, Ban } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/format';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#5C4033]', sent: 'bg-[#D4A854] text-[#5C4033]',
  partial: 'bg-[#E07A5F] text-white', received: 'bg-[#2D6A4F] text-white', cancelled: 'bg-[#8B7355] text-white',
};

interface POLine { id: number; description: string; quantity_ordered: string; quantity_received: string; unit_price: string; amount: string }
interface PO { id: number; po_number: string; vendor_name: string; order_date: string; expected_delivery_date: string | null; status: string; subtotal: string; tax_amount: string; shipping_cost: string; total: string; notes: string | null; approved_by: number | null; lines: POLine[]; receipts: Record<string, unknown>[] }

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [po, setPo] = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try { setPo(await api.get<PO>(`/purchase-orders/${id}`)); } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const doAction = async (action: string, body?: object) => {
    setActionLoading(true); setError('');
    try { await api.post(`/purchase-orders/${id}/${action}`, body || {}); await load(); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!po) return <Shell><p className="text-[#E07A5F]">{error || 'Not found'}</p></Shell>;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchase-orders"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-[#5C4033]">{po.po_number}</h1>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[po.status] || ''}`}>{po.status.toUpperCase()}</span>
        </div>
        <div className="flex gap-2">
          {po.status === 'draft' && !po.approved_by && <Button onClick={() => doAction('approve')} disabled={actionLoading}><Check className="mr-2 h-4 w-4" />Approve</Button>}
          {po.status === 'draft' && po.approved_by && <Button onClick={() => doAction('send')} disabled={actionLoading}><Send className="mr-2 h-4 w-4" />Send</Button>}
          {(po.status === 'sent' || po.status === 'partial') && (
            <Button variant="outline" onClick={() => doAction('receive', { receipt_date: new Date().toISOString().slice(0, 10), lines: po.lines.filter((l) => Number(l.quantity_received) < Number(l.quantity_ordered)).map((l) => ({ po_line_id: l.id, quantity_received: Number(l.quantity_ordered) - Number(l.quantity_received) })) })} disabled={actionLoading}>
              <Package className="mr-2 h-4 w-4" />Receive All</Button>)}
          {po.status === 'draft' && <Button variant="destructive" onClick={() => doAction('cancel')} disabled={actionLoading}><Ban className="mr-2 h-4 w-4" />Cancel</Button>}
        </div>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#E8DCC8] lg:col-span-2"><CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">Order Details</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div><p className="text-xs text-[#8B7355]">Vendor</p><p className="font-medium">{po.vendor_name}</p></div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Order Date</span><span>{formatDate(po.order_date)}</span></div>
                {po.expected_delivery_date && <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Expected</span><span>{formatDate(po.expected_delivery_date)}</span></div>}
              </div>
            </div>
            <Table><THead><TR><TH>Description</TH><TH className="text-right">Ordered</TH><TH className="text-right">Received</TH><TH className="text-right">Price</TH><TH className="text-right">Amount</TH></TR></THead>
              <TBody>{po.lines.map((l) => {
                const pct = Number(l.quantity_ordered) > 0 ? (Number(l.quantity_received) / Number(l.quantity_ordered)) * 100 : 0;
                return (
                  <TR key={l.id}><TD>{l.description}</TD><TD className="text-right font-mono">{Number(l.quantity_ordered).toFixed(2)}</TD>
                    <TD className="text-right"><span className="font-mono">{Number(l.quantity_received).toFixed(2)}</span>
                      <div className="mt-1 h-1.5 w-full rounded bg-[#E8DCC8]"><div className="h-full rounded" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 100 ? '#2D6A4F' : '#D4A854' }} /></div></TD>
                    <TD className="text-right font-mono">{formatCurrency(l.unit_price)}</TD><TD className="text-right font-mono">{formatCurrency(l.amount)}</TD></TR>);
              })}</TBody></Table>
            {po.notes && <div className="mt-4 rounded-md bg-[#E8DCC8]/30 p-3"><p className="text-xs font-medium text-[#8B7355]">Notes</p><p className="text-sm">{po.notes}</p></div>}
          </CardContent></Card>

        <Card className="border-[#E8DCC8]"><CardHeader><CardTitle className="text-[#5C4033]">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center"><p className="text-3xl font-bold text-[#5C4033]">{formatCurrency(po.total)}</p></div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-[#8B7355]">Subtotal</span><span className="font-mono">{formatCurrency(po.subtotal)}</span></div>
              {Number(po.tax_amount) > 0 && <div className="flex justify-between"><span className="text-[#8B7355]">Tax</span><span className="font-mono">{formatCurrency(po.tax_amount)}</span></div>}
              {Number(po.shipping_cost) > 0 && <div className="flex justify-between"><span className="text-[#8B7355]">Shipping</span><span className="font-mono">{formatCurrency(po.shipping_cost)}</span></div>}
            </div>
            {po.receipts && po.receipts.length > 0 && (
              <div className="mt-4 border-t border-[#E8DCC8] pt-3">
                <p className="text-xs font-medium text-[#8B7355] mb-2">Receipts ({po.receipts.length})</p>
                {po.receipts.map((r, i) => <div key={i} className="text-xs text-[#5C4033]">{formatDate(String(r.receipt_date))} — received</div>)}
              </div>)}
          </CardContent></Card>
      </div>
    </Shell>
  );
}
