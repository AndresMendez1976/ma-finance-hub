// New inventory transfer — from/to location, dynamic product lines
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
interface Line { product_id: string; quantity: string }

export default function NewTransferPage() {
  const router = useRouter();
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity: '1' }]);
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
  const addLine = () => setLines([...lines, { product_id: '', quantity: '1' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); };

  const save = async () => {
    if (!fromLocationId || !toLocationId) { setError('Both locations are required'); return; }
    if (fromLocationId === toLocationId) { setError('From and To locations must be different'); return; }
    if (lines.some(l => !l.product_id || !l.quantity)) { setError('All lines need product and quantity'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/inventory/transfers', {
        from_location_id: parseInt(fromLocationId, 10),
        to_location_id: parseInt(toLocationId, 10),
        lines: lines.map(l => ({ product_id: parseInt(l.product_id, 10), quantity: parseFloat(l.quantity) })),
      });
      router.push('/inventory/transfers');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const selectClass = 'flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]';

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Inventory Transfer</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      <Card className="border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Transfer Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#5C4033]">From Location *</label>
              <select value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)} className={selectClass}>
                <option value="">Select origin</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#5C4033]">To Location *</label>
              <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} className={selectClass}>
                <option value="">Select destination</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-md border border-[#E8DCC8] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#5C4033]">Items</p>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Line</Button>
            </div>
            <Table>
              <THead><TR><TH>Product</TH><TH className="text-right">Quantity</TH><TH></TH></TR></THead>
              <TBody>
                {lines.map((line, i) => (
                  <TR key={i}>
                    <TD><select value={line.product_id} onChange={(e) => updateLine(i, 'product_id', e.target.value)} className={selectClass}>
                      <option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}</select></TD>
                    <TD><Input type="number" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} min={1} className="w-24 text-right" /></TD>
                    <TD><Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4 text-[#E07A5F]" /></Button></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Complete Transfer'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
