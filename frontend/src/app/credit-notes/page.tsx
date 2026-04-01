// Credit Notes list page
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { Plus, Eye } from 'lucide-react';

interface CreditNote { id: number; credit_note_number: string; customer_name: string; issue_date: string; total: string; status: string }
interface CreditNoteResponse { data: CreditNote[]; pagination: { page: number; total: number; pages: number } }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#2C1810]',
  issued: 'bg-[#D4A854] text-[#2C1810]',
  applied: 'bg-[#2D6A4F] text-white',
  voided: 'bg-[#8B7355] text-white',
};

export default function CreditNotesPage() {
  const [data, setData] = useState<CreditNoteResponse | null>(null);
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
      setData(await api.get<CreditNoteResponse>(`/credit-notes?${params}`));
      setPage(p); setInit(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [search]);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Credit Notes</h1>
        <Link href="/credit-notes/new"><Button><Plus className="mr-2 h-4 w-4" />New Credit Note</Button></Link>
      </div>
      <div className="mb-4 flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search credit notes..." className="w-64"
          onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <Button variant="outline" onClick={() => load(1)}>Search</Button>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>CN #</TH><TH>Customer</TH><TH>Date</TH><TH className="text-right">Total</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={6} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data?.data.map((cn) => (
                <TR key={cn.id}>
                  <TD className="font-medium font-mono">{cn.credit_note_number}</TD>
                  <TD>{cn.customer_name}</TD>
                  <TD>{formatDate(cn.issue_date)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(cn.total)}</TD>
                  <TD><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[cn.status] || ''}`}>{cn.status.toUpperCase()}</span></TD>
                  <TD><Link href={`/credit-notes/${cn.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={6} className="text-center text-[#5C4033]">No credit notes found</TD></TR>}
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
