// BOM detail page with cost breakdown chart
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

interface BOMComponent { id: number; product_name: string; quantity: string; waste_pct: string; cost_per_unit: string; total_cost: string }
interface BOMLabor { id: number; description: string; hours: string; rate: string; total_cost: string }
interface BOMOverhead { id: number; description: string; type: string; amount: string }
interface BOM {
  id: number; name: string; product_name: string; version: string; status: string;
  yield_quantity: number; estimated_cost: string; material_cost: string; labor_cost: string; overhead_cost: string;
  components: BOMComponent[]; labor: BOMLabor[]; overhead: BOMOverhead[];
}

export default function BOMDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [bom, setBom] = useState<BOM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setBom(await api.get<BOM>(`/manufacturing/bom/${id}`)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Shell><p className="text-[#5C4033]">Loading...</p></Shell>;
  if (!bom) return <Shell><p className="text-[#E07A5F]">{error || 'BOM not found'}</p></Shell>;

  const mat = Number(bom.material_cost);
  const lab = Number(bom.labor_cost);
  const oh = Number(bom.overhead_cost);
  const total = mat + lab + oh;
  const pcts = total > 0 ? [mat / total * 100, lab / total * 100, oh / total * 100] : [0, 0, 0];

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/manufacturing/bom"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-[#2C1810]">{bom.name}</h1>
        <span className="font-mono text-sm text-[#5C4033]">v{bom.version}</span>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#5C4033]">Product</p><p className="font-medium text-[#2C1810]">{bom.product_name}</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#5C4033]">Yield</p><p className="font-medium text-[#2C1810]">{bom.yield_quantity} units</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#5C4033]">Total Cost</p><p className="text-xl font-bold font-mono text-[#2C1810]">${total.toFixed(2)}</p>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center">
          <p className="text-xs text-[#5C4033]">Cost per Unit</p><p className="text-xl font-bold font-mono text-[#2D6A4F]">${(total / (bom.yield_quantity || 1)).toFixed(2)}</p>
        </CardContent></Card>
      </div>
      {/* Cost breakdown bar */}
      <Card className="mb-4 border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#2C1810]">Cost Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-2 flex h-8 overflow-hidden rounded-full">
            <div style={{ width: `${pcts[0]}%` }} className="bg-[#D4A854]" title={`Material: ${pcts[0].toFixed(1)}%`} />
            <div style={{ width: `${pcts[1]}%` }} className="bg-[#2D6A4F]" title={`Labor: ${pcts[1].toFixed(1)}%`} />
            <div style={{ width: `${pcts[2]}%` }} className="bg-[#8B7355]" title={`Overhead: ${pcts[2].toFixed(1)}%`} />
          </div>
          <div className="flex gap-6 text-sm">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#D4A854]" />Material: ${mat.toFixed(2)} ({pcts[0].toFixed(1)}%)</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#2D6A4F]" />Labor: ${lab.toFixed(2)} ({pcts[1].toFixed(1)}%)</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#8B7355]" />Overhead: ${oh.toFixed(2)} ({pcts[2].toFixed(1)}%)</span>
          </div>
        </CardContent>
      </Card>
      <Card className="mb-4 border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#2C1810]">Components</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Product</TH><TH className="text-right">Qty</TH><TH className="text-right">Waste%</TH><TH className="text-right">Cost/Unit</TH><TH className="text-right">Total</TH></TR></THead>
            <TBody>
              {bom.components.map((c) => (
                <TR key={c.id}>
                  <TD>{c.product_name}</TD><TD className="text-right font-mono">{Number(c.quantity).toFixed(2)}</TD>
                  <TD className="text-right font-mono">{Number(c.waste_pct).toFixed(1)}%</TD>
                  <TD className="text-right font-mono">${Number(c.cost_per_unit).toFixed(2)}</TD>
                  <TD className="text-right font-mono font-bold">${Number(c.total_cost).toFixed(2)}</TD>
                </TR>
              ))}
              {!bom.components.length && <TR><TD colSpan={5} className="text-center text-[#5C4033]">No components</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Labor</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Description</TH><TH className="text-right">Hours</TH><TH className="text-right">Rate</TH><TH className="text-right">Total</TH></TR></THead>
              <TBody>
                {bom.labor.map((l) => (
                  <TR key={l.id}><TD>{l.description}</TD><TD className="text-right font-mono">{Number(l.hours).toFixed(1)}</TD><TD className="text-right font-mono">${Number(l.rate).toFixed(2)}</TD><TD className="text-right font-mono font-bold">${Number(l.total_cost).toFixed(2)}</TD></TR>
                ))}
                {!bom.labor.length && <TR><TD colSpan={4} className="text-center text-[#5C4033]">No labor</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Overhead</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Description</TH><TH>Type</TH><TH className="text-right">Amount</TH></TR></THead>
              <TBody>
                {bom.overhead.map((o) => (
                  <TR key={o.id}><TD>{o.description}</TD><TD className="capitalize">{o.type}</TD><TD className="text-right font-mono font-bold">${Number(o.amount).toFixed(2)}</TD></TR>
                ))}
                {!bom.overhead.length && <TR><TD colSpan={3} className="text-center text-[#5C4033]">No overhead</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
