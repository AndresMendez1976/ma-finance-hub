'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#2D6A4F] text-white',
  disposed: 'bg-[#8B7355] text-white',
  fully_depreciated: 'bg-[#D4A854] text-[#5C4033]',
};

interface Asset {
  id: number; asset_number: string; name: string; category: string;
  purchase_date: string; purchase_price: string; book_value: string; status: string;
}
interface Res { data: Asset[]; pagination: { page: number; limit: number; total: number; pages: number } }

export default function FixedAssetsPage() {
  const [data, setData] = useState<Res | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [init, setInit] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      params.set('page', String(p));
      const res = await api.get<Res>(`/fixed-assets?${params}`);
      setData(res); setPage(p); setInit(false);
    } catch { /* */ } finally { setLoading(false); }
  }, [search, status]);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Fixed Assets</h1>
        <Link href="/fixed-assets/new"><Button><Plus className="mr-2 h-4 w-4" />New Asset</Button></Link>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#8B7355]">Search</label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or #" className="w-48" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#8B7355]">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="disposed">Disposed</option>
            <option value="fully_depreciated">Fully Depreciated</option>
          </select>
        </div>
        <Button variant="outline" onClick={() => load(1)}>Filter</Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>Asset#</TH><TH>Name</TH><TH>Category</TH><TH>Purchase Date</TH><TH className="text-right">Purchase Price</TH><TH className="text-right">Book Value</TH><TH>Status</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={7} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data?.data.map((a) => (
                <TR key={a.id}>
                  <TD><Link href={`/fixed-assets/${a.id}`} className="font-mono text-sm text-[#2D6A4F] underline">{a.asset_number}</Link></TD>
                  <TD>{a.name}</TD><TD>{a.category}</TD><TD>{a.purchase_date}</TD>
                  <TD className="text-right font-mono">${Number(a.purchase_price).toFixed(2)}</TD>
                  <TD className="text-right font-mono">${Number(a.book_value).toFixed(2)}</TD>
                  <TD><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[a.status] || ''}`}>{a.status.replace('_', ' ')}</span></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={7} className="text-center text-[#8B7355]">No assets found</TD></TR>}
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
