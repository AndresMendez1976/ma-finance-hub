// New inventory adjustment — date, reason, dynamic lines with auto-calc difference
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

interface Product { id: number; sku: string; name: string }
interface Location { id: number; name: string }
interface Line { product_id: string; location_id: string; qty_on_hand: string; qty_counted: string; unit_cost: string }

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<Line[]>([{ product_id: '', location_id: '', qty_on_hand: '0', qty_counted: '0', unit_cost: '0' }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Product[]>('/products?limit=500').then(r => setProducts(Array.isArray(r) ? r : (r as { data: Product[] }).data || [])).catch(() => {});
    api.get<Location[]>('/inventory/locations').then((r: unknown) => setLocations(extractArray(r))).catch(() => {});
  }, []);

  const updateLine = (i: number, field: keyof Line, value: string) => {
    const next = [...lines]; next[i] = { ...next[i], [field]: value }; setLines(next);
  };
  const addLine = () => setLines([...lines, { product_id: '', location_id: '', qty_on_hand: '0', qty_counted: '0', unit_cost: '0' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); };

  const save = async () => {
    if (!reason.trim()) { setError('Reason is required'); return; }
    if (lines.some(l => !l.product_id || !l.location_id)) { setError('All lines need product and location'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/inventory/adjustments', {
        date, reason,
        lines: lines.map(l => ({
          product_id: parseInt(l.product_id, 10), location_id: parseInt(l.location_id, 10),
          qty_on_hand: parseFloat(l.qty_on_hand), qty_counted: parseFloat(l.qty_counted), unit_cost: parseFloat(l.unit_cost),
        })),
      });
      router.push('/inventory/adjustments');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const selectClass = 'flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]';

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Inventory Adjustment</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      <Card className="border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Adjustment Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="text-sm font-medium text-[#5C4033]">Date *</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Reason *</label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Physical count, damage, etc." /></div>
          </div>

          <div className="rounded-md border border-[#E8DCC8] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#5C4033]">Lines</p>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Line</Button>
            </div>
            <Table>
              <THead><TR><TH>Product</TH><TH>Location</TH><TH className="text-right">On Hand</TH><TH className="text-right">Counted</TH><TH className="text-right">Difference</TH><TH className="text-right">Unit Cost</TH><TH></TH></TR></THead>
              <TBody>
                {lines.map((line, i) => {
                  const diff = parseFloat(line.qty_counted || '0') - parseFloat(line.qty_on_hand || '0');
                  return (
                    <TR key={i}>
                      <TD><select value={line.product_id} onChange={(e) => updateLine(i, 'product_id', e.target.value)} className={selectClass}>
                        <option value="">Select</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}</select></TD>
                      <TD><select value={line.location_id} onChange={(e) => updateLine(i, 'location_id', e.target.value)} className={selectClass}>
                        <option value="">Select</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></TD>
                      <TD><Input type="number" value={line.qty_on_hand} onChange={(e) => updateLine(i, 'qty_on_hand', e.target.value)} className="w-20 text-right" /></TD>
                      <TD><Input type="number" value={line.qty_counted} onChange={(e) => updateLine(i, 'qty_counted', e.target.value)} className="w-20 text-right" /></TD>
                      <TD className={`text-right font-mono ${diff < 0 ? 'text-[#E07A5F]' : diff > 0 ? 'text-[#2D6A4F]' : ''}`}>{diff}</TD>
                      <TD><Input type="number" value={line.unit_cost} onChange={(e) => updateLine(i, 'unit_cost', e.target.value)} step={0.01} className="w-24 text-right" /></TD>
                      <TD><Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4 text-[#E07A5F]" /></Button></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          <Button onClick={save} disabled={loading}>{loading ? 'Posting...' : 'Post Adjustment'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
