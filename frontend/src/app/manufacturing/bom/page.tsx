// BOM list page
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Plus, Package, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#2C1810]', active: 'bg-[#2D6A4F] text-white', archived: 'bg-[#8B7355] text-white',
};

interface BOM {
  id: number; name: string; product_name: string; version: string;
  status: string; estimated_cost: string;
}
interface BOMResponse { data: BOM[]; pagination: { page: number; limit: number; total: number; pages: number } }

export default function BOMListPage() {
  const [data, setData] = useState<BOMResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get<BOMResponse>(`/manufacturing/bom?page=${p}&limit=25`);
      setData(res); setPage(p); setInitialLoad(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  if (initialLoad && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Bills of Materials</h1>
        <Link href="/manufacturing/bom/new"><Button><Plus className="mr-2 h-4 w-4" />New BOM</Button></Link>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Name</TH><TH>Product</TH><TH>Version</TH><TH>Status</TH><TH className="text-right">Estimated Cost</TH><TH>Actions</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={6} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data?.data.map((bom) => (
                <TR key={bom.id}>
                  <TD className="font-medium">{bom.name}</TD>
                  <TD>{bom.product_name}</TD>
                  <TD className="font-mono text-sm">{bom.version}</TD>
                  <TD><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[bom.status] || ''}`}>{bom.status}</span></TD>
                  <TD className="text-right font-mono">${Number(bom.estimated_cost).toFixed(2)}</TD>
                  <TD><Link href={`/manufacturing/bom/${bom.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && (
                <TR><TD colSpan={6} className="text-center text-[#5C4033]">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />No BOMs found
                </TD></TR>
              )}
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
