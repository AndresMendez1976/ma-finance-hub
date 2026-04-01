// Equipment list page
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, extractArray } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { Plus, Eye } from 'lucide-react';

interface Equipment { id: number; equipment_number: string; name: string; category: string; status: string; hourly_rate: string; assigned_project: string | null }
interface EquipmentResponse { data: Equipment[]; pagination: { page: number; total: number; pages: number } }

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-[#2D6A4F] text-white', assigned: 'bg-[#D4A854] text-[#2C1810]',
  maintenance: 'bg-[#E07A5F] text-white', retired: 'bg-[#8B7355] text-white',
};

export default function EquipmentPage() {
  const [data, setData] = useState<EquipmentResponse | null>(null);
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
      setData(await api.get<EquipmentResponse>(`/equipment?${params}`));
      setPage(p); setInit(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [search]);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Equipment</h1>
        <Link href="/equipment/new"><Button><Plus className="mr-2 h-4 w-4" />New Equipment</Button></Link>
      </div>
      <div className="mb-4 flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment..." className="w-64"
          onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <Button variant="outline" onClick={() => load(1)}>Search</Button>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>Equip #</TH><TH>Name</TH><TH>Category</TH><TH>Status</TH><TH className="text-right">Hourly Rate</TH><TH>Assigned Project</TH><TH>Actions</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={7} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data?.data.map((eq) => (
                <TR key={eq.id}>
                  <TD className="font-mono font-medium">{eq.equipment_number}</TD>
                  <TD>{eq.name}</TD>
                  <TD><span className="rounded bg-[#E8DCC8] px-2 py-0.5 text-xs font-medium">{eq.category}</span></TD>
                  <TD><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[eq.status] || ''}`}>{eq.status}</span></TD>
                  <TD className="text-right font-mono">{formatCurrency(eq.hourly_rate)}/hr</TD>
                  <TD className="text-sm text-[#5C4033]">{eq.assigned_project || '—'}</TD>
                  <TD><Link href={`/equipment/${eq.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={7} className="text-center text-[#5C4033]">No equipment found</TD></TR>}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#5C4033]">
              <span>Page {page} of {data.pagination.pages} ({data.pagination.total} total) | {formatDate(new Date().toISOString())}</span>
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
