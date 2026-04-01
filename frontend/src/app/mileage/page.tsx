// Mileage list page
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { Plus } from 'lucide-react';

interface MileageEntry { id: number; date: string; description: string; miles: number; rate: string; amount: string; status: string }
interface MileageResponse { data: MileageEntry[]; pagination: { page: number; total: number; pages: number } }

export default function MileagePage() {
  const [data, setData] = useState<MileageResponse | null>(null);
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
      setData(await api.get<MileageResponse>(`/mileage?${params}`));
      setPage(p); setInit(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [search]);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Mileage Log</h1>
        <Link href="/mileage/new"><Button><Plus className="mr-2 h-4 w-4" />Log Mileage</Button></Link>
      </div>
      <div className="mb-4 flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trips..." className="w-64"
          onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <Button variant="outline" onClick={() => load(1)}>Search</Button>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>Date</TH><TH>Description</TH><TH className="text-right">Miles</TH><TH className="text-right">Rate</TH><TH className="text-right">Amount</TH><TH>Status</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={6} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data?.data.map((m) => (
                <TR key={m.id}>
                  <TD>{formatDate(m.date)}</TD>
                  <TD className="font-medium">{m.description}</TD>
                  <TD className="text-right font-mono">{m.miles.toLocaleString()}</TD>
                  <TD className="text-right font-mono">{formatCurrency(m.rate)}/mi</TD>
                  <TD className="text-right font-mono font-medium">{formatCurrency(m.amount)}</TD>
                  <TD><Badge variant={m.status === 'approved' ? 'success' : m.status === 'pending' ? 'warning' : 'secondary'}>{m.status}</Badge></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={6} className="text-center text-[#8B7355]">No mileage entries</TD></TR>}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#8B7355]">
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
