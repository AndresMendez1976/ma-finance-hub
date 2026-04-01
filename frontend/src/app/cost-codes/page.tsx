// Cost Codes hierarchical list
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
import { Plus } from 'lucide-react';

interface CostCode { id: number; code: string; name: string; category: string; unit: string | null; default_cost: string | null; parent_id: number | null; depth: number }

export default function CostCodesPage() {
  const [data, setData] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [init, setInit] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await api.get<unknown>(`/cost-codes?${params}`);
      setData(extractArray<CostCode>(res)); setInit(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [search]);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Cost Codes</h1>
        <Link href="/cost-codes/new"><Button><Plus className="mr-2 h-4 w-4" />New Cost Code</Button></Link>
      </div>
      <div className="mb-4 flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search codes..." className="w-64"
          onKeyDown={(e) => e.key === 'Enter' && load()} />
        <Button variant="outline" onClick={() => load()}>Search</Button>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>Code</TH><TH>Name</TH><TH>Category</TH><TH>Unit</TH><TH className="text-right">Default Cost</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={5} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data.map((cc) => (
                <TR key={cc.id}>
                  <TD className="font-mono font-medium" style={{ paddingLeft: `${(cc.depth || 0) * 24 + 16}px` }}>
                    {cc.depth > 0 && <span className="text-[#D4C4A8] mr-1">{'--'.repeat(cc.depth)}</span>}{cc.code}
                  </TD>
                  <TD>{cc.name}</TD>
                  <TD><span className="rounded bg-[#E8DCC8] px-2 py-1 text-xs font-medium text-[#2C1810]">{cc.category}</span></TD>
                  <TD className="text-sm text-[#5C4033]">{cc.unit || '—'}</TD>
                  <TD className="text-right font-mono">{cc.default_cost ? formatCurrency(cc.default_cost) : '—'}</TD>
                </TR>
              ))}
              {!loading && !data.length && <TR><TD colSpan={5} className="text-center text-[#5C4033]">No cost codes found</TD></TR>}
            </TBody>
          </Table>
          <p className="mt-2 text-xs text-[#5C4033]">Last updated: {formatDate(new Date().toISOString())}</p>
        </CardContent>
      </Card>
    </Shell>
  );
}
