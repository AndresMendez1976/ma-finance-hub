// New Purchase Order form
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

interface Contact { id: number; first_name: string; last_name: string | null; company_name: string | null; type: string }
interface POLine { description: string; quantity_ordered: number; unit_price: number; account_id?: number }

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<POLine[]>([{ description: '', quantity_ordered: 1, unit_price: 0 }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get<{ data: Contact[] }>('/contacts?type=vendor&limit=100').then((r) => setContacts(r.data)).catch(() => {}); }, []);

  const lineAmounts = lines.map((l) => Math.round(l.quantity_ordered * l.unit_price * 100) / 100);
  const subtotal = lineAmounts.reduce((s, a) => s + a, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount + shippingCost) * 100) / 100;

  const selectContact = (cid: string) => {
    setContactId(cid);
    const c = contacts.find((x) => String(x.id) === cid);
    if (c) setVendorName([c.company_name, c.first_name, c.last_name].filter(Boolean).join(' '));
  };

  const save = async () => {
    if (!vendorName || !orderDate) { setError('Vendor and order date required'); return; }
    if (lines.some((l) => !l.description)) { setError('All lines need a description'); return; }
    setLoading(true); setError('');
    try {
      const po = await api.post<{ id: number }>('/purchase-orders', {
        contact_id: contactId ? parseInt(contactId, 10) : undefined, vendor_name: vendorName,
        order_date: orderDate, expected_delivery_date: deliveryDate || undefined,
        tax_rate: taxRate, shipping_cost: shippingCost, notes: notes || undefined,
        lines: lines.map((l) => ({ description: l.description, quantity_ordered: l.quantity_ordered, unit_price: l.unit_price })),
      });
      router.push(`/purchase-orders/${po.id}`);
    } catch (e: unknown) { setError((e as Error).message); } finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Purchase Order</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]"><CardHeader><CardTitle className="text-[#5C4033]">Vendor</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><label className="text-sm font-medium text-[#5C4033]">Select Contact</label>
            <select value={contactId} onChange={(e) => selectContact(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]">
              <option value="">— or type manually —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.company_name || ''} {c.first_name} {c.last_name || ''}</option>)}
            </select></div>
          <div><label className="text-sm font-medium text-[#5C4033]">Vendor Name *</label><Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} /></div>
        </CardContent></Card>
        <Card className="border-[#E8DCC8]"><CardHeader><CardTitle className="text-[#5C4033]">Details</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-[#5C4033]">Order Date *</label><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Expected Delivery</label><Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-[#5C4033]">Tax %</label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} step={0.01} /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Shipping</label><Input type="number" value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} step={0.01} /></div>
          </div>
          <div><label className="text-sm font-medium text-[#5C4033]">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]" /></div>
        </CardContent></Card>
      </div>
      <Card className="mt-4 border-[#E8DCC8]"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-[#5C4033]">Line Items</CardTitle><Button size="sm" variant="outline" onClick={() => setLines([...lines, { description: '', quantity_ordered: 1, unit_price: 0 }])}><Plus className="mr-1 h-3 w-3" />Add</Button></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[#8B7355]"><div className="col-span-5">Description</div><div className="col-span-2">Qty</div><div className="col-span-2">Unit Price</div><div className="col-span-2 text-right">Amount</div><div className="col-span-1"></div></div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-5"><Input value={l.description} onChange={(e) => { const u = [...lines]; u[i] = { ...u[i], description: e.target.value }; setLines(u); }} /></div>
                <div className="col-span-2"><Input type="number" value={l.quantity_ordered} onChange={(e) => { const u = [...lines]; u[i] = { ...u[i], quantity_ordered: parseFloat(e.target.value) || 0 }; setLines(u); }} step={0.01} /></div>
                <div className="col-span-2"><Input type="number" value={l.unit_price} onChange={(e) => { const u = [...lines]; u[i] = { ...u[i], unit_price: parseFloat(e.target.value) || 0 }; setLines(u); }} step={0.01} /></div>
                <div className="col-span-2 text-right font-mono text-sm">${lineAmounts[i]?.toFixed(2)}</div>
                <div className="col-span-1"><Button size="icon" variant="ghost" onClick={() => lines.length > 1 && setLines(lines.filter((_, idx) => idx !== i))} disabled={lines.length <= 1}><Trash2 className="h-4 w-4 text-[#E07A5F]" /></Button></div>
              </div>))}
          </div>
          <div className="mt-4 border-t border-[#E8DCC8] pt-4 text-right space-y-1">
            <div className="flex justify-end gap-8 text-sm"><span className="text-[#8B7355]">Subtotal:</span><span className="w-28 font-mono">${subtotal.toFixed(2)}</span></div>
            {taxRate > 0 && <div className="flex justify-end gap-8 text-sm"><span className="text-[#8B7355]">Tax ({taxRate}%):</span><span className="w-28 font-mono">${taxAmount.toFixed(2)}</span></div>}
            {shippingCost > 0 && <div className="flex justify-end gap-8 text-sm"><span className="text-[#8B7355]">Shipping:</span><span className="w-28 font-mono">${shippingCost.toFixed(2)}</span></div>}
            <div className="flex justify-end gap-8 text-lg font-bold"><span className="text-[#5C4033]">Total:</span><span className="w-28 font-mono">${total.toFixed(2)}</span></div>
          </div>
        </CardContent></Card>
      <div className="mt-4"><Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Create Purchase Order'}</Button></div>
    </Shell>
  );
}
