'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Building2 } from 'lucide-react';

interface PortalInvoice {
  id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: string;
  status: string;
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

export default function PortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/v1/portal/${token}/invoices`);
        if (!res.ok) throw new Error('Failed to load invoices');
        const data = await res.json();
        setInvoices(data);
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

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

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#5C4033]">Your Invoices</h2>
          <Link
            href={`/portal/${token}/statements`}
            className="rounded-md bg-[#5C4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#8B7355] transition-colors"
          >
            View Statement
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-[#E07A5F] bg-[#E07A5F]/10 p-4 text-sm text-[#E07A5F]">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-12 text-center text-[#8B7355]">Loading invoices...</div>
        )}

        {!loading && invoices.length === 0 && !error && (
          <div className="py-12 text-center text-[#8B7355]">
            <FileText className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p>No invoices found</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/portal/${token}/invoices/${inv.id}`}>
              <div className="rounded-lg border border-[#E8DCC8] bg-white p-5 shadow-sm transition-shadow hover:shadow-md cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[#5C4033]">{inv.invoice_number}</p>
                    <p className="mt-1 text-sm text-[#8B7355]">
                      Issued: {inv.issue_date}
                    </p>
                    <p className="text-sm text-[#8B7355]">
                      Due: {inv.due_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#5C4033]">
                      {fmt(Number(inv.total))}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[inv.status] || 'bg-[#E8DCC8] text-[#5C4033]'}`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8DCC8] py-6 text-center text-xs text-[#8B7355]">
        Powered by MA Finance Hub &mdash; maishq.com
      </footer>
    </div>
  );
}
