// New Vendor Bill form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

interface Line { description: string; quantity: string; unit_price: string; account_id: string }

export default function NewBillPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [vendorRef, setVendorRef] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [poId, setPoId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: '1', unit_price: '0', account_id: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addLine = () => setLines([...lines, { description: '', quantity: '1', unit_price: '0', account_id: '' }]);
  const updateLine = (i: number, field: keyof Line, value: string) => {
    const updated = [...lines]; updated[i] = { ...updated[i], [field]: value }; setLines(updated);
  };
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const subtotal = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_price), 0);

  const save = async () => {
    if (!vendorId || !billNumber) { setError('Vendor and bill number are required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/bills', {
        vendor_id: parseInt(vendorId), bill_number: billNumber, vendor_ref: vendorRef || undefined,
        bill_date: billDate, due_date: dueDate || undefined, purchase_order_id: poId ? parseInt(poId) : undefined,
        notes: notes || undefined,
        lines: lines.map((l) => ({ description: l.description, quantity: parseFloat(l.quantity), unit_price: parseFloat(l.unit_price), account_id: l.account_id ? parseInt(l.account_id) : undefined })),
      });
      router.push('/bills');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">New Vendor Bill</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Bill Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className="text-sm font-medium text-[#2C1810]">Vendor ID *</label><Input value={vendorId} onChange={(e) => setVendorId(e.target.value)} type="number" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-[#2C1810]">Bill # *</label><Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Vendor Ref #</label><Input value={vendorRef} onChange={(e) => setVendorRef(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-[#2C1810]">Bill Date</label><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Due Date</label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium text-[#2C1810]">PO Link (optional)</label><Input value={poId} onChange={(e) => setPoId(e.target.value)} type="number" placeholder="Purchase Order ID" /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810]" />
            </div>
            <p className="text-xs text-[#5C4033]">Bill date: {formatDate(billDate)} {dueDate ? `| Due: ${formatDate(dueDate)}` : ''}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Line Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1"><label className="text-xs text-[#5C4033]">Description</label><Input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} /></div>
                <div className="w-20"><label className="text-xs text-[#5C4033]">Qty</label><Input type="number" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} /></div>
                <div className="w-28"><label className="text-xs text-[#5C4033]">Price</label><Input type="number" value={line.unit_price} onChange={(e) => updateLine(i, 'unit_price', e.target.value)} step="0.01" /></div>
                <div className="w-24 text-right text-sm font-mono pt-5">{formatCurrency(Number(line.quantity) * Number(line.unit_price))}</div>
                <Button size="sm" variant="ghost" onClick={() => removeLine(i)} className="text-[#E07A5F]">X</Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addLine}>+ Add Line</Button>
            <div className="border-t border-[#E8DCC8] pt-3">
              <div className="flex justify-between text-lg font-bold"><span className="text-[#2C1810]">Total</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
            </div>
            <Button onClick={save} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Create Bill'}</Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
