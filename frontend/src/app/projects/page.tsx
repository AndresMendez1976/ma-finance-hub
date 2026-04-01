'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { Plus, Eye, FolderOpen } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#2D6A4F] text-white', completed: 'bg-[#8B7355] text-white',
  on_hold: 'bg-[#D4A854] text-[#5C4033]', cancelled: 'bg-[#E07A5F] text-white',
};

interface Project {
  id: number; name: string; client_name: string; status: string;
  budget_amount: string; total_revenue: string; total_cost: string; profit: string;
}

const fmt = (n: number) => formatCurrency(n);

export default function ProjectsPage() {
  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get<Project[]>('/projects'); setData(extractArray(res)); setInitialLoad(false); }
    catch { /* handled */ } finally { setLoading(false); }
  }, []);

  if (initialLoad && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Projects</h1>
        <Link href="/projects/new"><Button><Plus className="mr-2 h-4 w-4" />New Project</Button></Link>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Name</TH><TH>Client</TH><TH>Status</TH><TH className="text-right">Budget</TH><TH className="text-right">Revenue</TH><TH className="text-right">Cost</TH><TH className="text-right">Profit</TH><TH>Actions</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={8} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data.map((p) => {
                const profit = Number(p.profit);
                return (
                  <TR key={p.id}>
                    <TD className="font-medium">{p.name}</TD>
                    <TD>{p.client_name}</TD>
                    <TD><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[p.status] || ''}`}>{p.status}</span></TD>
                    <TD className="text-right font-mono">{fmt(Number(p.budget_amount))}</TD>
                    <TD className="text-right font-mono">{fmt(Number(p.total_revenue))}</TD>
                    <TD className="text-right font-mono">{fmt(Number(p.total_cost))}</TD>
                    <TD className="text-right font-mono" style={{ color: profit >= 0 ? '#2D6A4F' : '#E07A5F' }}>
                      {fmt(profit)}
                    </TD>
                    <TD><Link href={`/projects/${p.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                  </TR>
                );
              })}
              {!loading && data.length === 0 && (
                <TR><TD colSpan={8} className="text-center text-[#8B7355]"><FolderOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />No projects found</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
