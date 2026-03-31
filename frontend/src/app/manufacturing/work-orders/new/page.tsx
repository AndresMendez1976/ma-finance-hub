// New Work Order form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [bomId, setBomId] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState('normal');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onBomChange = async (val: string) => {
    setBomId(val);
    if (val) {
      try {
        const bom = await api.get<{ product_name: string }>(`/manufacturing/bom/${val}`);
        setProductName(bom.product_name);
      } catch { /* */ }
    }
  };

  const save = async () => {
    if (!bomId || !quantity) { setError('BOM and quantity are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post<{ id: number }>('/manufacturing/work-orders', {
        bom_id: parseInt(bomId), quantity, priority,
        start_date: startDate || undefined, due_date: dueDate || undefined,
        location: location || undefined, notes: notes || undefined,
      });
      router.push(`/manufacturing/work-orders/${res.id}`);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Work Order</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <Card className="max-w-xl border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Work Order Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#5C4033]">BOM ID *</label>
            <Input value={bomId} onChange={(e) => onBomChange(e.target.value)} placeholder="Enter BOM ID" />
          </div>
          {productName && (
            <div className="rounded-md bg-[#E8DCC8]/30 p-2 text-sm text-[#5C4033]">
              Product: <span className="font-medium">{productName}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Quantity *</label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} min={1} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                <option value="low">Low</option><option value="normal">Normal</option>
                <option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-[#5C4033]">Start Date</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Due Date</label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-medium text-[#5C4033]">Location</label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Production area" /></div>
          <div>
            <label className="text-sm font-medium text-[#5C4033]">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes..."
              className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033] placeholder:text-[#8B7355]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" />
          </div>
          <Button onClick={save} disabled={loading}>{loading ? 'Creating...' : 'Create Work Order'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
