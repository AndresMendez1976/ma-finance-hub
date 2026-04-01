// New BOM form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

interface Component { product_id: string; quantity: number; waste_pct: number; cost_per_unit: number }
interface Labor { description: string; hours: number; rate: number }
interface Overhead { description: string; type: 'fixed' | 'per_unit'; amount: number }

export default function NewBOMPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [version, setVersion] = useState('1.0');
  const [yieldQty, setYieldQty] = useState(1);
  const [components, setComponents] = useState<Component[]>([{ product_id: '', quantity: 1, waste_pct: 0, cost_per_unit: 0 }]);
  const [labor, setLabor] = useState<Labor[]>([{ description: '', hours: 0, rate: 0 }]);
  const [overhead, setOverhead] = useState<Overhead[]>([{ description: '', type: 'fixed', amount: 0 }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const materialCost = components.reduce((s, c) => s + c.quantity * (1 + c.waste_pct / 100) * c.cost_per_unit, 0);
  const laborCost = labor.reduce((s, l) => s + l.hours * l.rate, 0);
  const overheadCost = overhead.reduce((s, o) => s + o.amount, 0);
  const totalCost = materialCost + laborCost + overheadCost;

  const updateComp = (i: number, f: string, v: string | number) => { const u = [...components]; u[i] = { ...u[i], [f]: v }; setComponents(u); };
  const updateLabor = (i: number, f: string, v: string | number) => { const u = [...labor]; u[i] = { ...u[i], [f]: v }; setLabor(u); };
  const updateOh = (i: number, f: string, v: string | number) => { const u = [...overhead]; u[i] = { ...u[i], [f]: v }; setOverhead(u); };

  const save = async () => {
    if (!name || !productId) { setError('Name and product are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post<{ id: number }>('/manufacturing/bom', {
        name, product_id: parseInt(productId), version, yield_quantity: yieldQty,
        components: components.filter((c) => c.product_id),
        labor: labor.filter((l) => l.description),
        overhead: overhead.filter((o) => o.description),
      });
      router.push(`/manufacturing/bom/${res.id}`);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">New Bill of Materials</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <Card className="mb-4 border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#2C1810]">BOM Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div><label className="text-sm font-medium text-[#2C1810]">Name *</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Product ID *</label><Input value={productId} onChange={(e) => setProductId(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Version</label><Input value={version} onChange={(e) => setVersion(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Yield Qty</label><Input type="number" value={yieldQty} onChange={(e) => setYieldQty(parseInt(e.target.value) || 1)} min={1} /></div>
          </div>
        </CardContent>
      </Card>
      <Card className="mb-4 border-[#E8DCC8]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#2C1810]">Components</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setComponents([...components, { product_id: '', quantity: 1, waste_pct: 0, cost_per_unit: 0 }])}><Plus className="mr-1 h-3 w-3" />Add</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[#5C4033]"><div className="col-span-3">Product ID</div><div className="col-span-2">Qty</div><div className="col-span-2">Waste%</div><div className="col-span-2">Cost/Unit</div><div className="col-span-2 text-right">Total</div><div className="col-span-1"></div></div>
            {components.map((c, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-3"><Input value={c.product_id} onChange={(e) => updateComp(i, 'product_id', e.target.value)} placeholder="Product ID" /></div>
                <div className="col-span-2"><Input type="number" value={c.quantity} onChange={(e) => updateComp(i, 'quantity', parseFloat(e.target.value) || 0)} min={0} step={0.01} /></div>
                <div className="col-span-2"><Input type="number" value={c.waste_pct} onChange={(e) => updateComp(i, 'waste_pct', parseFloat(e.target.value) || 0)} min={0} step={0.1} /></div>
                <div className="col-span-2"><Input type="number" value={c.cost_per_unit} onChange={(e) => updateComp(i, 'cost_per_unit', parseFloat(e.target.value) || 0)} min={0} step={0.01} /></div>
                <div className="col-span-2 text-right font-mono text-sm">${(c.quantity * (1 + c.waste_pct / 100) * c.cost_per_unit).toFixed(2)}</div>
                <div className="col-span-1"><Button size="icon" variant="ghost" onClick={() => setComponents(components.filter((_, j) => j !== i))} disabled={components.length <= 1}><Trash2 className="h-4 w-4 text-[#E07A5F]" /></Button></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#2C1810]">Labor</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLabor([...labor, { description: '', hours: 0, rate: 0 }])}><Plus className="mr-1 h-3 w-3" />Add</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {labor.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={l.description} onChange={(e) => updateLabor(i, 'description', e.target.value)} placeholder="Description" className="flex-1" />
                <Input type="number" value={l.hours} onChange={(e) => updateLabor(i, 'hours', parseFloat(e.target.value) || 0)} placeholder="Hrs" className="w-20" min={0} step={0.5} />
                <Input type="number" value={l.rate} onChange={(e) => updateLabor(i, 'rate', parseFloat(e.target.value) || 0)} placeholder="Rate" className="w-24" min={0} step={0.01} />
                <Button size="icon" variant="ghost" onClick={() => setLabor(labor.filter((_, j) => j !== i))} disabled={labor.length <= 1}><Trash2 className="h-4 w-4 text-[#E07A5F]" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#2C1810]">Overhead</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setOverhead([...overhead, { description: '', type: 'fixed', amount: 0 }])}><Plus className="mr-1 h-3 w-3" />Add</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {overhead.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={o.description} onChange={(e) => updateOh(i, 'description', e.target.value)} placeholder="Description" className="flex-1" />
                <select value={o.type} onChange={(e) => updateOh(i, 'type', e.target.value)} className="h-10 rounded-md border border-[#D4C4A8] bg-white px-2 text-sm text-[#2C1810]">
                  <option value="fixed">Fixed</option><option value="per_unit">Per Unit</option>
                </select>
                <Input type="number" value={o.amount} onChange={(e) => updateOh(i, 'amount', parseFloat(e.target.value) || 0)} placeholder="Amount" className="w-24" min={0} step={0.01} />
                <Button size="icon" variant="ghost" onClick={() => setOverhead(overhead.filter((_, j) => j !== i))} disabled={overhead.length <= 1}><Trash2 className="h-4 w-4 text-[#E07A5F]" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4 border-[#E8DCC8]">
        <CardContent className="flex items-center justify-between pt-4">
          <div className="flex gap-6 text-sm">
            <span className="text-[#5C4033]">Material: <span className="font-mono font-medium">${materialCost.toFixed(2)}</span></span>
            <span className="text-[#5C4033]">Labor: <span className="font-mono font-medium">${laborCost.toFixed(2)}</span></span>
            <span className="text-[#5C4033]">Overhead: <span className="font-mono font-medium">${overheadCost.toFixed(2)}</span></span>
            <span className="text-lg font-bold text-[#2C1810]">Total: <span className="font-mono">${totalCost.toFixed(2)}</span></span>
          </div>
          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save BOM'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
