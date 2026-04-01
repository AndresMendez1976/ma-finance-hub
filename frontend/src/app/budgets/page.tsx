'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import Link from 'next/link';

interface Budget {
  id: number; name: string; fiscal_year: number; period_type: string; status: string;
}
interface Res { data: Budget[]; pagination: { page: number; limit: number; total: number; pages: number } }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#2C1810]',
  active: 'bg-[#2D6A4F] text-white',
  closed: 'bg-[#8B7355] text-white',
};

export default function BudgetsPage() {
  const [data, setData] = useState<Res | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [init, setInit] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get<Res>(`/budgets?page=${p}`);
      setData(res); setPage(p); setInit(false);
    } catch { /* */ } finally { setLoading(false); }
  }, []);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Budgets</h1>
        <Link href="/budgets/new"><Button><Plus className="mr-2 h-4 w-4" />New Budget</Button></Link>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>Name</TH><TH>Fiscal Year</TH><TH>Period Type</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={5} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data?.data.map((b) => (
                <TR key={b.id}>
                  <TD><Link href={`/budgets/${b.id}`} className="text-[#2D6A4F] underline">{b.name}</Link></TD>
                  <TD>{b.fiscal_year}</TD>
                  <TD className="capitalize">{b.period_type}</TD>
                  <TD><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[b.status] || ''}`}>{b.status}</span></TD>
                  <TD><Link href={`/budgets/${b.id}`}><Button size="sm" variant="ghost">View</Button></Link></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={5} className="text-center text-[#5C4033]">No budgets found</TD></TR>}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#5C4033]">
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
