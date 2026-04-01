// Inventory adjustments list
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
  draft: 'info', pending: 'warning', posted: 'success', voided: 'secondary',
};

interface Adjustment { id: number; adjustment_number: string; date: string; status: string; reason: string }
interface AdjustmentResponse { data: Adjustment[]; pagination: { page: number; total: number; pages: number } }

export default function AdjustmentsPage() {
  const [data, setData] = useState<AdjustmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [init, setInit] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      setData(await api.get<AdjustmentResponse>(`/inventory/adjustments?${params}`));
      setPage(p); setInit(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Inventory Adjustments</h1>
        <Link href="/inventory/adjustments/new"><Button><Plus className="mr-2 h-4 w-4" />New Adjustment</Button></Link>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>#</TH><TH>Date</TH><TH>Reason</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={5} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data?.data.map((adj) => (
                <TR key={adj.id}>
                  <TD className="font-mono text-sm">{adj.adjustment_number}</TD>
                  <TD>{adj.date}</TD>
                  <TD>{adj.reason}</TD>
                  <TD><Badge variant={STATUS_COLORS[adj.status] || 'secondary'}>{adj.status}</Badge></TD>
                  <TD><Link href={`/inventory/adjustments/${adj.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={5} className="text-center text-[#8B7355]">No adjustments found</TD></TR>}
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
