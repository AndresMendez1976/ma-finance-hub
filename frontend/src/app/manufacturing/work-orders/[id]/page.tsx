// Work Order detail page
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft, Play, CheckCircle, XCircle, Package, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#B4D4E7] text-[#2C1810]', released: 'bg-[#D4A854] text-[#2C1810]',
  in_progress: 'bg-[#E07A5F] text-white', completed: 'bg-[#2D6A4F] text-white', cancelled: 'bg-[#8B7355] text-white',
};

interface MaterialUsage { id: number; product_name: string; qty_planned: string; qty_used: string; cost: string }
interface LaborEntry { id: number; description: string; hours_planned: string; hours_actual: string; cost: string }
interface WorkOrder {
  id: number; wo_number: string; product_name: string; bom_name: string; status: string; priority: string;
  qty_to_produce: number; qty_produced: number; start_date: string; due_date: string; location: string;
  notes: string | null; estimated_cost: string; actual_cost: string;
  materials: MaterialUsage[]; labor: LaborEntry[];
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setWo(await api.get<WorkOrder>(`/manufacturing/work-orders/${id}`)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const action = async (act: string) => {
    setActionLoading(true); setError('');
    try { await api.post(`/manufacturing/work-orders/${id}/${act}`); await load(); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <Shell><p className="text-[#5C4033]">Loading...</p></Shell>;
  if (!wo) return <Shell><p className="text-[#E07A5F]">{error || 'Work order not found'}</p></Shell>;

  const pct = wo.qty_to_produce > 0 ? (wo.qty_produced / wo.qty_to_produce) * 100 : 0;
  const variance = Number(wo.actual_cost) - Number(wo.estimated_cost);

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/manufacturing/work-orders"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-[#2C1810]">{wo.wo_number}</h1>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[wo.status] || ''}`}>{wo.status.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div className="flex gap-2">
          {wo.status === 'draft' && <Button onClick={() => action('release')} disabled={actionLoading}><Package className="mr-2 h-4 w-4" />Release</Button>}
          {wo.status === 'released' && <Button onClick={() => action('start')} disabled={actionLoading}><Play className="mr-2 h-4 w-4" />Start</Button>}
          {wo.status === 'in_progress' && (
            <>
              <Button variant="outline" onClick={() => action('record-materials')} disabled={actionLoading}>Record Materials</Button>
              <Button variant="outline" onClick={() => action('record-labor')} disabled={actionLoading}><Clock className="mr-2 h-4 w-4" />Record Labor</Button>
              <Button onClick={() => action('complete')} disabled={actionLoading}><CheckCircle className="mr-2 h-4 w-4" />Complete</Button>
            </>
          )}
          {wo.status !== 'completed' && wo.status !== 'cancelled' && (
            <Button variant="destructive" onClick={() => action('cancel')} disabled={actionLoading}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
          )}
        </div>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="mb-4 grid gap-4 md:grid-cols-5">
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#5C4033]">Product</p><p className="font-medium text-[#2C1810]">{wo.product_name}</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#5C4033]">Progress</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#E8DCC8]"><div className="h-full rounded-full bg-[#2D6A4F]" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
          <p className="mt-1 text-sm font-mono">{wo.qty_produced}/{wo.qty_to_produce}</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#5C4033]">Estimated Cost</p><p className="font-mono font-bold text-[#2C1810]">${Number(wo.estimated_cost).toFixed(2)}</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#5C4033]">Actual Cost</p><p className="font-mono font-bold text-[#2C1810]">${Number(wo.actual_cost).toFixed(2)}</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#5C4033]">Variance</p>
          <p className={`font-mono font-bold ${variance > 0 ? 'text-[#E07A5F]' : 'text-[#2D6A4F]'}`}>
            {variance > 0 ? '+' : ''}{variance.toFixed(2)}
          </p>
        </CardContent></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Material Usage</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Material</TH><TH className="text-right">Planned</TH><TH className="text-right">Used</TH><TH className="text-right">Cost</TH></TR></THead>
              <TBody>
                {wo.materials?.map((m) => (
                  <TR key={m.id}>
                    <TD>{m.product_name}</TD><TD className="text-right font-mono">{Number(m.qty_planned).toFixed(2)}</TD>
                    <TD className="text-right font-mono">{Number(m.qty_used).toFixed(2)}</TD><TD className="text-right font-mono">${Number(m.cost).toFixed(2)}</TD>
                  </TR>
                ))}
                {(!wo.materials || wo.materials.length === 0) && <TR><TD colSpan={4} className="text-center text-[#5C4033]">No materials recorded</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Labor</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Description</TH><TH className="text-right">Planned</TH><TH className="text-right">Actual</TH><TH className="text-right">Cost</TH></TR></THead>
              <TBody>
                {wo.labor?.map((l) => (
                  <TR key={l.id}>
                    <TD>{l.description}</TD><TD className="text-right font-mono">{Number(l.hours_planned).toFixed(1)}h</TD>
                    <TD className="text-right font-mono">{Number(l.hours_actual).toFixed(1)}h</TD><TD className="text-right font-mono">${Number(l.cost).toFixed(2)}</TD>
                  </TR>
                ))}
                {(!wo.labor || wo.labor.length === 0) && <TR><TD colSpan={4} className="text-center text-[#5C4033]">No labor recorded</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
