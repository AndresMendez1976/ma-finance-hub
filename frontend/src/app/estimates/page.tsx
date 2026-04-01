'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Plus, Eye, FileText } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#5C4033]',
  sent: 'bg-[#D4A854] text-[#5C4033]',
  accepted: 'bg-[#2D6A4F] text-white',
  rejected: 'bg-[#E07A5F] text-white',
  expired: 'bg-[#8B7355] text-white',
  converted: 'bg-[#2D6A4F] text-white',
};

interface Estimate {
  id: number;
  estimate_number: string;
  customer_name: string;
  issue_date: string;
  expiration_date: string;
  total: string;
  status: string;
}

interface EstimateResponse { data: Estimate[]; pagination: { page: number; limit: number; total: number; pages: number }; }

export default function EstimatesPage() {
  const [data, setData] = useState<EstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', String(p));
      params.set('limit', '25');
      const res = await api.get<EstimateResponse>(`/estimates?${params}`);
      setData(res); setPage(p); setInitialLoad(false);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [status, from, to]);

  if (initialLoad && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Estimates</h1>
        <Link href="/estimates/new"><Button><Plus className="mr-2 h-4 w-4" />New Estimate</Button></Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#8B7355]">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
            <option value="">All</option><option value="draft">Draft</option><option value="sent">Sent</option>
            <option value="accepted">Accepted</option><option value="rejected">Rejected</option>
            <option value="expired">Expired</option><option value="converted">Converted</option>
          </select>
        </div>
        <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
        <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        <Button variant="outline" onClick={() => load(1)}>Filter</Button>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>EST#</TH><TH>Customer</TH><TH>Issue Date</TH><TH>Expiration</TH><TH className="text-right">Total</TH><TH>Status</TH><TH>Actions</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={7} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data?.data.map((est) => (
                <TR key={est.id}>
                  <TD className="font-mono text-sm">{est.estimate_number}</TD>
                  <TD>{est.customer_name}</TD>
                  <TD>{formatDate(est.issue_date)}</TD>
                  <TD>{formatDate(est.expiration_date)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(est.total)}</TD>
                  <TD><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[est.status] || ''}`}>{est.status}</span></TD>
                  <TD><Link href={`/estimates/${est.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                </TR>
              ))}
              {!loading && (!data?.data.length) && (
                <TR><TD colSpan={7} className="text-center text-[#8B7355]"><FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />No estimates found</TD></TR>
              )}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#8B7355]">
              <span>Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)</span>
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
