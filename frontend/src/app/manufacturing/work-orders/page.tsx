// Work Orders list page
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Plus, ClipboardList, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#5C4033]', released: 'bg-[#D4A854] text-[#5C4033]',
  in_progress: 'bg-[#E07A5F] text-white', completed: 'bg-[#2D6A4F] text-white', cancelled: 'bg-[#8B7355] text-white',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-200 text-gray-700', normal: 'bg-blue-100 text-blue-700',
  high: 'bg-[#D4A854]/20 text-[#D4A854]', urgent: 'bg-[#E07A5F]/20 text-[#E07A5F]',
};

interface WorkOrder {
  id: number; wo_number: string; product_name: string; qty_to_produce: number;
  qty_produced: number; status: string; priority: string;
}
interface WOResponse { data: WorkOrder[]; pagination: { page: number; limit: number; total: number; pages: number } }

export default function WorkOrdersPage() {
  const [data, setData] = useState<WOResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get<WOResponse>(`/manufacturing/work-orders?page=${p}&limit=25`);
      setData(res); setPage(p); setInitialLoad(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  if (initialLoad && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Work Orders</h1>
        <Link href="/manufacturing/work-orders/new"><Button><Plus className="mr-2 h-4 w-4" />New Work Order</Button></Link>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>WO#</TH><TH>Product</TH><TH className="text-right">Quantity</TH><TH>Status</TH><TH>Priority</TH><TH>Progress</TH><TH>Actions</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={7} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data?.data.map((wo) => {
                const pct = wo.qty_to_produce > 0 ? (wo.qty_produced / wo.qty_to_produce) * 100 : 0;
                return (
                  <TR key={wo.id}>
                    <TD className="font-mono text-sm">{wo.wo_number}</TD>
                    <TD>{wo.product_name}</TD>
                    <TD className="text-right font-mono">{wo.qty_to_produce}</TD>
                    <TD><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[wo.status] || ''}`}>{wo.status.replace('_', ' ')}</span></TD>
                    <TD><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[wo.priority] || ''}`}>{wo.priority}</span></TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-[#E8DCC8]">
                          <div className="h-full rounded-full bg-[#2D6A4F]" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono text-[#8B7355]">{wo.qty_produced}/{wo.qty_to_produce}</span>
                      </div>
                    </TD>
                    <TD><Link href={`/manufacturing/work-orders/${wo.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                  </TR>
                );
              })}
              {!loading && !data?.data.length && (
                <TR><TD colSpan={7} className="text-center text-[#8B7355]">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />No work orders found
                </TD></TR>
              )}
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
