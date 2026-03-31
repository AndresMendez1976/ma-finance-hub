'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-[#B4D4E7] text-[#5C4033]',
  in_progress: 'bg-[#D4A854] text-[#5C4033]',
  completed: 'bg-[#2D6A4F] text-white',
  overdue: 'bg-[#E07A5F] text-white',
};

interface MaintRecord {
  id: number; title: string; asset_name: string; type: string;
  scheduled_date: string; status: string; cost: string;
}
interface Res { data: MaintRecord[]; pagination: { page: number; limit: number; total: number; pages: number } }

export default function MaintenancePage() {
  const [data, setData] = useState<Res | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'upcoming' | 'overdue'>('all');
  const [page, setPage] = useState(1);
  const [init, setInit] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== 'all') params.set('filter', tab);
      params.set('page', String(p));
      const res = await api.get<Res>(`/maintenance?${params}`);
      setData(res); setPage(p); setInit(false);
    } catch { /* */ } finally { setLoading(false); }
  }, [tab]);

  if (init && !loading) { void load(); }

  const tabs = ['upcoming', 'overdue', 'all'] as const;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Maintenance</h1>
        <div className="flex gap-2">
          <Link href="/maintenance/schedules"><Button variant="outline">Schedules</Button></Link>
          <Link href="/maintenance/new"><Button><Plus className="mr-2 h-4 w-4" />New Record</Button></Link>
        </div>
      </div>
      <div className="mb-4 flex gap-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => { setTab(t); setInit(true); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-[#2D6A4F] text-white' : 'bg-[#E8DCC8]/50 text-[#5C4033] hover:bg-[#E8DCC8]'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>Title</TH><TH>Asset</TH><TH>Type</TH><TH>Scheduled Date</TH><TH>Status</TH><TH className="text-right">Cost</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={6} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data?.data.map((m) => (
                <TR key={m.id}>
                  <TD>{m.title}</TD><TD>{m.asset_name}</TD><TD>{m.type}</TD><TD>{m.scheduled_date}</TD>
                  <TD><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[m.status] || ''}`}>{m.status.replace('_', ' ')}</span></TD>
                  <TD className="text-right font-mono">${Number(m.cost).toFixed(2)}</TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={6} className="text-center text-[#8B7355]">No records found</TD></TR>}
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
