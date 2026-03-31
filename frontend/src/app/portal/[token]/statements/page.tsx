'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';

interface StatementLine {
  id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: string;
  paid_amount: string;
  balance: string;
  status: string;
}

interface StatementData {
  customer_name: string;
  lines: StatementLine[];
  total_invoiced: number;
  total_paid: number;
  total_balance: number;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#E8DCC8] text-[#5C4033]',
  sent: 'bg-[#D4A854] text-[#5C4033]',
  paid: 'bg-[#2D6A4F] text-white',
  overdue: 'bg-[#E07A5F] text-white',
  voided: 'bg-[#8B7355] text-white',
};

export default function PortalStatementPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/v1/portal/${token}/statement`);
        if (!res.ok) throw new Error('Failed to load statement');
        const result = await res.json();
        setData(result);
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
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Building2 className="h-8 w-8 text-[#5C4033]" />
          <div>
            <h1 className="text-xl font-bold text-[#5C4033]">MA Finance Hub</h1>
            <p className="text-xs text-[#8B7355]">Customer Portal</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/portal/${token}`}
            className="flex items-center gap-1 text-sm text-[#8B7355] hover:text-[#5C4033] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#5C4033]">Account Statement</h2>
          {data?.customer_name && (
            <p className="mt-1 text-[#8B7355]">{data.customer_name}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-[#E07A5F] bg-[#E07A5F]/10 p-4 text-sm text-[#E07A5F]">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-12 text-center text-[#8B7355]">Loading statement...</div>
        )}

        {!loading && data && (
          <div className="rounded-lg border border-[#E8DCC8] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8DCC8] bg-[#E8DCC8]/30">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[#8B7355]">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[#8B7355]">Issue Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[#8B7355]">Due Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-[#8B7355]">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[#8B7355]">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[#8B7355]">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[#8B7355]">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[#8B7355]">
                        No transactions found
                      </td>
                    </tr>
                  )}
                  {data.lines.map((line) => (
                    <tr key={line.id} className="border-b border-[#E8DCC8]/50 hover:bg-[#E8DCC8]/10">
                      <td className="px-4 py-3 text-sm font-medium text-[#5C4033]">
                        <Link
                          href={`/portal/${token}/invoices/${line.id}`}
                          className="hover:underline text-[#D4A854]"
                        >
                          {line.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5C4033]">{line.issue_date}</td>
                      <td className="px-4 py-3 text-sm text-[#5C4033]">{line.due_date}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[line.status] || 'bg-[#E8DCC8] text-[#5C4033]'}`}
                        >
                          {line.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[#5C4033]">{fmt(Number(line.total))}</td>
                      <td className="px-4 py-3 text-right text-sm text-[#2D6A4F]">{fmt(Number(line.paid_amount))}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-[#5C4033]">{fmt(Number(line.balance))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#5C4033] bg-[#E8DCC8]/20">
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-[#5C4033]">Totals</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#5C4033]">{fmt(data.total_invoiced)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#2D6A4F]">{fmt(data.total_paid)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#E07A5F]">{fmt(data.total_balance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8DCC8] py-6 text-center text-xs text-[#8B7355]">
        Powered by MA Finance Hub &mdash; maishq.com
      </footer>
    </div>
  );
}
