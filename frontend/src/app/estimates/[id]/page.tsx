'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { Send, Check, X, FileText, Download } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#5C4033]', sent: 'bg-[#D4A854] text-[#5C4033]',
  accepted: 'bg-[#2D6A4F] text-white', rejected: 'bg-[#E07A5F] text-white',
  expired: 'bg-[#8B7355] text-white', converted: 'bg-[#2D6A4F] text-white',
};

interface EstimateLine { id: number; description: string; quantity: number; unit_price: string; line_total: string; }
interface Estimate {
  id: number; estimate_number: string; customer_name: string; customer_email: string;
  customer_address: string; issue_date: string; expiration_date: string;
  subtotal: string; tax_rate: string; tax_amount: string; total: string;
  status: string; notes: string; lines: EstimateLine[];
}

export default function EstimateDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: est, loading, refetch } = useApi<Estimate>(`/estimates/${id}`);
  const [actionLoading, setActionLoading] = useState('');

  const doAction = async (action: string) => {
    setActionLoading(action);
    try {
      if (action === 'convert') {
        const inv = await api.post<{ id: number }>(`/estimates/${id}/convert`);
        router.push(`/invoices/${inv.id}`);
        return;
      }
      await api.post(`/estimates/${id}/${action}`);
      refetch();
    } catch { /* handled */ }
    finally { setActionLoading(''); }
  };

  if (loading || !est) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#5C4033]">Estimate {est.estimate_number}</h1>
          <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[est.status] || ''}`}>{est.status}</span>
        </div>
        <div className="flex gap-2">
          {est.status === 'draft' && <Button size="sm" onClick={() => doAction('send')} disabled={!!actionLoading}><Send className="mr-1 h-4 w-4" />Send</Button>}
          {est.status === 'sent' && <>
            <Button size="sm" onClick={() => doAction('accept')} disabled={!!actionLoading}><Check className="mr-1 h-4 w-4" />Accept</Button>
            <Button size="sm" variant="destructive" onClick={() => doAction('reject')} disabled={!!actionLoading}><X className="mr-1 h-4 w-4" />Reject</Button>
          </>}
          {(est.status === 'accepted') && <Button size="sm" onClick={() => doAction('convert')} disabled={!!actionLoading}><FileText className="mr-1 h-4 w-4" />Convert to Invoice</Button>}
          <Button size="sm" variant="outline" onClick={() => window.open(`/api/v1/estimates/${id}/pdf`, '_blank')}><Download className="mr-1 h-4 w-4" />PDF</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-[#5C4033]">{est.customer_name}</p>
            {est.customer_email && <p className="text-[#8B7355]">{est.customer_email}</p>}
            {est.customer_address && <p className="text-[#8B7355] whitespace-pre-line">{est.customer_address}</p>}
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[#8B7355]">Issue Date</span><span>{est.issue_date}</span></div>
            <div className="flex justify-between"><span className="text-[#8B7355]">Expiration</span><span>{est.expiration_date}</span></div>
            <div className="flex justify-between"><span className="text-[#8B7355]">Tax Rate</span><span>{est.tax_rate}%</span></div>
            {est.notes && <div className="mt-2 rounded bg-[#E8DCC8]/30 p-2 text-[#8B7355]">{est.notes}</div>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 border-[#E8DCC8]">
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Description</TH><TH className="text-right">Qty</TH><TH className="text-right">Unit Price</TH><TH className="text-right">Amount</TH></TR></THead>
            <TBody>
              {est.lines?.map((line) => (
                <TR key={line.id}>
                  <TD>{line.description}</TD>
                  <TD className="text-right">{line.quantity}</TD>
                  <TD className="text-right font-mono">${Number(line.unit_price).toFixed(2)}</TD>
                  <TD className="text-right font-mono">${Number(line.line_total).toFixed(2)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="mt-4 border-t border-[#E8DCC8] pt-4 text-right">
            <div className="flex justify-end gap-8 text-sm"><span className="text-[#8B7355]">Subtotal:</span><span className="w-28 font-mono">${Number(est.subtotal).toFixed(2)}</span></div>
            {Number(est.tax_amount) > 0 && <div className="flex justify-end gap-8 text-sm"><span className="text-[#8B7355]">Tax:</span><span className="w-28 font-mono">${Number(est.tax_amount).toFixed(2)}</span></div>}
            <div className="flex justify-end gap-8 text-lg font-bold"><span className="text-[#5C4033]">Total:</span><span className="w-28 font-mono">${Number(est.total).toFixed(2)}</span></div>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
