// New invoice creation form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

interface InvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  account_id?: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: '', quantity: 1, unit_price: 0 }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Computed totals
  const lineAmounts = lines.map((l) => Math.round(l.quantity * l.unit_price * 100) / 100);
  const subtotal = lineAmounts.reduce((s, a) => s + a, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const addLine = () => setLines([...lines, { description: '', quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); };
  const updateLine = (i: number, field: keyof InvoiceLine, value: string | number) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const save = async (andSend: boolean) => {
    if (!customerName || !issueDate || !dueDate) { setError('Customer name, issue date, and due date required'); return; }
    if (lines.some((l) => !l.description || l.quantity <= 0)) { setError('All lines need a description and quantity > 0'); return; }
    setLoading(true); setError('');
    try {
      const invoice = await api.post<{ id: number }>('/invoices', {
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_address: customerAddress || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: taxRate,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          account_id: l.account_id || undefined,
        })),
      });
      if (andSend) {
        await api.post(`/invoices/${invoice.id}/send`);
      }
      router.push(`/invoices/${invoice.id}`);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">New Invoice</h1>

      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Customer info */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-[#2C1810]">Name *</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#2C1810]">Email</label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@email.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#2C1810]">Address</label>
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Billing address"
                className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#5C4033]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice details */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Issue Date *</label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Due Date *</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#2C1810]">Tax Rate (%)</label>
              <Input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} min={0} max={100} step={0.01} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#2C1810]">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Invoice notes..."
                className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#5C4033]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card className="mt-4 border-[#E8DCC8]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#2C1810]">Line Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Line</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[#5C4033]">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1"></div>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-5">
                  <Input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} placeholder="Description" />
                </div>
                <div className="col-span-2">
                  <Input type="number" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} min={0.01} step={0.01} />
                </div>
                <div className="col-span-2">
                  <Input type="number" value={line.unit_price} onChange={(e) => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} min={0} step={0.01} />
                </div>
                <div className="col-span-2 text-right font-mono text-sm">${lineAmounts[i]?.toFixed(2)}</div>
                <div className="col-span-1">
                  <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length <= 1}>
                    <Trash2 className="h-4 w-4 text-[#E07A5F]" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 border-t border-[#E8DCC8] pt-4 text-right">
            <div className="flex justify-end gap-8 text-sm">
              <span className="text-[#5C4033]">Subtotal:</span>
              <span className="w-28 font-mono">${subtotal.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-[#5C4033]">Tax ({taxRate}%):</span>
                <span className="w-28 font-mono">${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-end gap-8 text-lg font-bold">
              <span className="text-[#2C1810]">Total:</span>
              <span className="w-28 font-mono">${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <Button variant="outline" onClick={() => save(false)} disabled={loading}>
          {loading ? 'Saving...' : 'Save as Draft'}
        </Button>
        <Button onClick={() => save(true)} disabled={loading}>
          {loading ? 'Saving...' : 'Save & Send'}
        </Button>
      </div>
    </Shell>
  );
}
