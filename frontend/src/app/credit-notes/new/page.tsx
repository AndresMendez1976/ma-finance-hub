// New Credit Note form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

interface Line { description: string; quantity: string; unit_price: string }

export default function NewCreditNotePage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [reason, setReason] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: '1', unit_price: '0' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addLine = () => setLines([...lines, { description: '', quantity: '1', unit_price: '0' }]);
  const updateLine = (i: number, field: keyof Line, value: string) => {
    const updated = [...lines]; updated[i] = { ...updated[i], [field]: value }; setLines(updated);
  };
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const subtotal = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_price), 0);
  const taxAmount = subtotal * Number(taxRate) / 100;
  const total = subtotal + taxAmount;

  const save = async () => {
    if (!customerId) { setError('Customer is required'); return; }
    if (!lines.length) { setError('At least one line is required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/credit-notes', {
        customer_id: parseInt(customerId), invoice_id: invoiceId ? parseInt(invoiceId) : undefined,
        reason, issue_date: issueDate, tax_rate: parseFloat(taxRate), notes: notes || undefined,
        lines: lines.map((l) => ({ description: l.description, quantity: parseFloat(l.quantity), unit_price: parseFloat(l.unit_price) })),
      });
      router.push('/credit-notes');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Credit Note</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Credit Note Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className="text-sm font-medium text-[#5C4033]">Customer ID *</label><Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} type="number" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Invoice ID (optional)</label><Input value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} type="number" placeholder="Link to invoice" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Reason *</label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-[#5C4033]">Date</label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#5C4033]">Tax Rate (%)</label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} step="0.01" /></div>
            </div>
            <div><label className="text-sm font-medium text-[#5C4033]">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Line Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1"><label className="text-xs text-[#8B7355]">Description</label><Input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} /></div>
                <div className="w-20"><label className="text-xs text-[#8B7355]">Qty</label><Input type="number" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} /></div>
                <div className="w-28"><label className="text-xs text-[#8B7355]">Price</label><Input type="number" value={line.unit_price} onChange={(e) => updateLine(i, 'unit_price', e.target.value)} step="0.01" /></div>
                <div className="w-24 text-right text-sm font-mono pt-5">{formatCurrency(Number(line.quantity) * Number(line.unit_price))}</div>
                <Button size="sm" variant="ghost" onClick={() => removeLine(i)} className="text-[#E07A5F]">X</Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addLine}>+ Add Line</Button>
            <div className="border-t border-[#E8DCC8] pt-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Tax ({taxRate}%)</span><span className="font-mono">{formatCurrency(taxAmount)}</span></div>
              <div className="flex justify-between text-lg font-bold"><span className="text-[#5C4033]">Total</span><span className="font-mono">{formatCurrency(total)}</span></div>
            </div>
            <p className="text-xs text-[#8B7355]">Date preview: {formatDate(issueDate)}</p>
            <Button onClick={save} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Create Credit Note'}</Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
