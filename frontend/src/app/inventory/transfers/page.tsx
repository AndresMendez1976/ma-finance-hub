// Inventory transfers list
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, extractArray } from '@/lib/api';
import { Plus, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, 'info' | 'warning' | 'success' | 'secondary'> = {
  draft: 'info', in_transit: 'warning', completed: 'success', cancelled: 'secondary',
};

interface Transfer { id: number; transfer_number: string; date: string; status: string; from_location_name: string; to_location_name: string; line_count: number }
interface TransferResponse { data: Transfer[]; pagination: { page: number; total: number; pages: number } }

export default function TransfersPage() {
  const [data, setData] = useState<TransferResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [init, setInit] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      setData(await api.get<TransferResponse>(`/inventory/transfers?${params}`));
      setPage(p); setInit(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Inventory Transfers</h1>
        <Link href="/inventory/transfers/new"><Button><Plus className="mr-2 h-4 w-4" />New Transfer</Button></Link>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>#</TH><TH>Date</TH><TH>From</TH><TH>To</TH><TH className="text-right">Items</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={7} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data?.data.map((t) => (
                <TR key={t.id}>
                  <TD className="font-mono text-sm">{t.transfer_number}</TD>
                  <TD>{t.date}</TD>
                  <TD>{t.from_location_name}</TD>
                  <TD>{t.to_location_name}</TD>
                  <TD className="text-right font-mono">{t.line_count}</TD>
                  <TD><Badge variant={STATUS_COLORS[t.status] || 'secondary'}>{t.status}</Badge></TD>
                  <TD><Link href={`/inventory/transfers/${t.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={7} className="text-center text-[#5C4033]">No transfers found</TD></TR>}
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
