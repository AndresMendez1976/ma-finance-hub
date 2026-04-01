// Recurring Expenses list
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, extractArray } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { Plus } from 'lucide-react';

interface RecurringExpense { id: number; description: string; vendor_name: string; amount: string; frequency: string; next_run_date: string; status: string }
interface RecurringExpenseResponse { data: RecurringExpense[]; pagination: { page: number; total: number; pages: number } }

export default function RecurringExpensesPage() {
  const [data, setData] = useState<RecurringExpenseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [init, setInit] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(p));
      setData(await api.get<RecurringExpenseResponse>(`/recurring-expenses?${params}`));
      setPage(p); setInit(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [search]);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Recurring Expenses</h1>
        <Link href="/recurring-expenses/new"><Button><Plus className="mr-2 h-4 w-4" />New Recurring Expense</Button></Link>
      </div>
      <div className="mb-4 flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-64"
          onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <Button variant="outline" onClick={() => load(1)}>Search</Button>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>Description</TH><TH>Vendor</TH><TH className="text-right">Amount</TH><TH>Frequency</TH><TH>Next Run</TH><TH>Status</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={6} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data?.data.map((re) => (
                <TR key={re.id}>
                  <TD className="font-medium">{re.description}</TD>
                  <TD>{re.vendor_name}</TD>
                  <TD className="text-right font-mono">{formatCurrency(re.amount)}</TD>
                  <TD><span className="rounded bg-[#E8DCC8] px-2 py-0.5 text-xs font-medium">{re.frequency}</span></TD>
                  <TD>{formatDate(re.next_run_date)}</TD>
                  <TD><Badge variant={re.status === 'active' ? 'success' : 'secondary'}>{re.status}</Badge></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={6} className="text-center text-[#5C4033]">No recurring expenses</TD></TR>}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#5C4033]">
              <span>Page {page} of {data.pagination.pages} ({data.pagination.total} total)</span>
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
