'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, Download, ArrowLeft } from 'lucide-react';

interface InvoiceLine {
  id: number;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

interface PortalInvoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_address: string | null;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
  notes: string | null;
  paid_date: string | null;
  paid_amount: string;
  lines: InvoiceLine[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#E8DCC8] text-[#5C4033]',
  sent: 'bg-[#D4A854] text-[#5C4033]',
  paid: 'bg-[#2D6A4F] text-white',
  overdue: 'bg-[#E07A5F] text-white',
  voided: 'bg-[#8B7355] text-white',
};

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PortalInvoiceViewPage() {
  const params = useParams();
  const token = params.token as string;
  const id = params.id as string;
  const [invoice, setInvoice] = useState<PortalInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/v1/portal/${token}/invoices/${id}`);
        if (!res.ok) throw new Error('Failed to load invoice');
        const data = await res.json();
        setInvoice(data);
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, id]);

  const handleDownloadPdf = () => {
    window.open(`/api/v1/portal/${token}/invoices/${id}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#E8DCC8]/30 to-white">
        <p className="text-[#8B7355]">Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#E8DCC8]/30 to-white">
        <div className="text-center">
          <p className="mb-4 text-[#E07A5F]">{error || 'Invoice not found'}</p>
          <Link href={`/portal/${token}`} className="text-sm text-[#5C4033] underline">
            Back to invoices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8DCC8]/30 to-white">
      {/* Header */}
      <header className="border-b border-[#E8DCC8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Building2 className="h-8 w-8 text-[#5C4033]" />
          <div>
            <h1 className="text-xl font-bold text-[#5C4033]">MA Finance Hub</h1>
            <p className="text-xs text-[#8B7355]">Customer Portal</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Navigation and actions */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/portal/${token}`}
            className="flex items-center gap-1 text-sm text-[#8B7355] hover:text-[#5C4033] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-md bg-[#5C4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#8B7355] transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>

        {/* Invoice card */}
        <div className="rounded-lg border border-[#E8DCC8] bg-white shadow-sm">
          {/* Invoice header */}
          <div className="border-b border-[#E8DCC8] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#5C4033]">INVOICE</h2>
                <p className="mt-1 text-lg font-semibold text-[#D4A854]">{invoice.invoice_number}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[invoice.status] || 'bg-[#E8DCC8] text-[#5C4033]'}`}
              >
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="grid gap-6 border-b border-[#E8DCC8] p-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-[#8B7355]">Bill To</p>
              <p className="mt-1 font-semibold text-[#5C4033]">{invoice.customer_name}</p>
              {invoice.customer_email && (
                <p className="text-sm text-[#8B7355]">{invoice.customer_email}</p>
              )}
              {invoice.customer_address && (
                <p className="mt-1 whitespace-pre-line text-sm text-[#8B7355]">
                  {invoice.customer_address}
                </p>
              )}
            </div>
            <div className="space-y-2 text-right">
              <div>
                <p className="text-xs font-medium uppercase text-[#8B7355]">Issue Date</p>
                <p className="font-medium text-[#5C4033]">{invoice.issue_date}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[#8B7355]">Due Date</p>
                <p className="font-medium text-[#5C4033]">{invoice.due_date}</p>
              </div>
              {invoice.paid_date && (
                <div>
                  <p className="text-xs font-medium uppercase text-[#8B7355]">Paid Date</p>
                  <p className="font-medium text-[#2D6A4F]">{invoice.paid_date}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8DCC8]">
                  <th className="pb-2 text-left text-xs font-medium uppercase text-[#8B7355]">Description</th>
                  <th className="pb-2 text-right text-xs font-medium uppercase text-[#8B7355]">Qty</th>
                  <th className="pb-2 text-right text-xs font-medium uppercase text-[#8B7355]">Unit Price</th>
                  <th className="pb-2 text-right text-xs font-medium uppercase text-[#8B7355]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="border-b border-[#E8DCC8]/50">
                    <td className="py-3 text-sm text-[#5C4033]">{line.description}</td>
                    <td className="py-3 text-right text-sm text-[#5C4033]">{line.quantity}</td>
                    <td className="py-3 text-right text-sm text-[#5C4033]">{fmt(Number(line.unit_price))}</td>
                    <td className="py-3 text-right text-sm font-medium text-[#5C4033]">{fmt(Number(line.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-[#8B7355]">
                  <span>Subtotal</span>
                  <span>{fmt(Number(invoice.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm text-[#8B7355]">
                  <span>Tax ({Number(invoice.tax_rate)}%)</span>
                  <span>{fmt(Number(invoice.tax_amount))}</span>
                </div>
                <div className="flex justify-between border-t border-[#E8DCC8] pt-2 text-lg font-bold text-[#5C4033]">
                  <span>Total</span>
                  <span>{fmt(Number(invoice.total))}</span>
                </div>
                {Number(invoice.paid_amount) > 0 && (
                  <div className="flex justify-between text-sm text-[#2D6A4F]">
                    <span>Paid</span>
                    <span>{fmt(Number(invoice.paid_amount))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-[#E8DCC8] p-6">
              <p className="text-xs font-medium uppercase text-[#8B7355]">Notes</p>
              <p className="mt-1 whitespace-pre-line text-sm text-[#5C4033]">{invoice.notes}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8DCC8] py-6 text-center text-xs text-[#8B7355]">
        Powered by MA Finance Hub &mdash; maishq.com
      </footer>
    </div>
  );
}
