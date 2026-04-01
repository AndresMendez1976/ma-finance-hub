// Expenses list page — filterable by status, category, vendor, date range
'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Plus, Eye, Check, Send, Ban } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/format';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[#B4D4E7] text-[#5C4033]', approved: 'bg-[#D4A854] text-[#5C4033]',
  posted: 'bg-[#2D6A4F] text-white', voided: 'bg-[#8B7355] text-white',
};

interface Expense { id: number; expense_number: string; date: string; vendor_name: string; category: string; amount: string; status: string; account_name: string }
interface ExpenseResponse { data: Expense[]; pagination: { page: number; limit: number; total: number; pages: number } }

export default function ExpensesPage() {
  const [data, setData] = useState<ExpenseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vendor, setVendor] = useState('');
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (vendor) params.set('vendor', vendor);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', String(p));
      const res = await api.get<ExpenseResponse>(`/expenses?${params}`);
      setData(res); setPage(p); setInitialLoad(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [status, from, to, vendor]);

  if (initialLoad && !loading) { void load(); }

  const doAction = async (id: number, action: string, body?: object) => {
    try {
      await api.post(`/expenses/${id}/${action}`, body);
      setActionMsg(`Expense ${action}ed successfully`);
      await load(page);
    } catch (e: unknown) { setActionMsg((e as Error).message); }
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Expenses</h1>
        <Link href="/expenses/new"><Button><Plus className="mr-2 h-4 w-4" />New Expense</Button></Link>
      </div>

      {actionMsg && <div className="mb-3 rounded-md bg-[#2D6A4F]/10 p-2 text-sm text-[#2D6A4F]">{actionMsg}</div>}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#8B7355]">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted</option>
            <option value="voided">Voided</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#8B7355]">Vendor</label>
          <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Search vendor" className="w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#8B7355]">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#8B7355]">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" onClick={() => load(1)}>Filter</Button>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>#</TH><TH>Date</TH><TH>Vendor</TH><TH>Category</TH><TH className="text-right">Amount</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={7} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data?.data.map((exp) => (
                <TR key={exp.id}>
                  <TD className="font-mono text-sm">{exp.expense_number}</TD>
                  <TD>{formatDate(exp.date)}</TD>
                  <TD>{exp.vendor_name}</TD>
                  <TD>{exp.category}</TD>
                  <TD className="text-right font-mono">{formatCurrency(exp.amount)}</TD>
                  <TD><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[exp.status] || ''}`}>{exp.status}</span></TD>
                  <TD className="flex gap-1">
                    {exp.status === 'pending' && <Button size="sm" variant="ghost" title="Approve" onClick={() => doAction(exp.id, 'approve')}><Check className="h-4 w-4 text-[#2D6A4F]" /></Button>}
                    {(exp.status === 'approved' || exp.status === 'pending') && <Button size="sm" variant="ghost" title="Post" onClick={() => doAction(exp.id, 'post', { fiscal_period_id: 1 })}><Send className="h-4 w-4 text-[#D4A854]" /></Button>}
                    {exp.status !== 'voided' && <Button size="sm" variant="ghost" title="Void" onClick={() => doAction(exp.id, 'void')}><Ban className="h-4 w-4 text-[#E07A5F]" /></Button>}
                  </TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={7} className="text-center text-[#8B7355]">No expenses found</TD></TR>}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#8B7355]">
              <span>Page {data.pagination.page} of {data.pagination.pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= data.pagination.pages} onClick={() => load(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
