'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

interface InvoiceLine { description: string; quantity: number; unit_price: number; account_id?: number; product_id?: string }
interface Product { id: number; name: string; description: string; unit_price: number }

const PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90'];
const selectCls = 'flex h-10 w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]';

export default function NewInvoicePage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: '', quantity: 1, unit_price: 0 }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Product[]>('/products').then((r: unknown) => setProducts(extractArray(r))).catch(() => {});
  }, []);

  // Auto-calculate due date from payment terms
  const applyTerms = (terms: string) => {
    setPaymentTerms(terms);
    if (!issueDate) return;
    const base = new Date(issueDate);
    const days = terms === 'Due on Receipt' ? 0 : parseInt(terms.replace('Net ', ''), 10);
    base.setDate(base.getDate() + days);
    setDueDate(base.toISOString().slice(0, 10));
  };

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

  const selectProduct = (i: number, productId: string) => {
    const product = products.find((p) => String(p.id) === productId);
    if (product) {
      const updated = [...lines];
      updated[i] = { ...updated[i], product_id: productId, description: product.description || product.name, unit_price: product.unit_price };
      setLines(updated);
    } else {
      updateLine(i, 'product_id', '');
    }
  };

  const save = async (andSend: boolean) => {
    if (!customerName || !issueDate || !dueDate) { setError('Customer name, issue date, and due date required'); return; }
    if (lines.some((l) => !l.description || l.quantity <= 0)) { setError('All lines need a description and quantity > 0'); return; }
    setLoading(true); setError('');
    try {
      const invoice = await api.post<{ id: number }>('/invoices', {
        customer_name: customerName, customer_email: customerEmail || undefined,
        customer_address: customerAddress || undefined,
        issue_date: issueDate, due_date: dueDate, tax_rate: taxRate,
        po_number: poNumber || undefined, payment_terms: paymentTerms || undefined,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          description: l.description, quantity: l.quantity, unit_price: l.unit_price,
          account_id: l.account_id || undefined, product_id: l.product_id ? parseInt(l.product_id, 10) : undefined,
        })),
      });
      if (andSend) await api.post(`/invoices/${invoice.id}/send`);
      router.push(`/invoices/${invoice.id}`);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold" style={{ color: '#2C1810' }}>New Invoice</h1>
      {error && <div className="mb-4 rounded-md p-3 text-sm" style={{ backgroundColor: '#E07A5F20', color: '#E07A5F' }}>{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle style={{ color: '#2C1810' }}>Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Name *</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Email</label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@email.com" />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Address</label>
              <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Billing address" rows={3}
                className="flex w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#5C4033]/60 focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle style={{ color: '#2C1810' }}>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Issue Date *</label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Due Date *</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>PO / Reference</label>
                <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-12345" />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Payment Terms</label>
                <select value={paymentTerms} onChange={(e) => applyTerms(e.target.value)} className={selectCls}>
                  {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Tax Rate (%)</label>
              <Input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} min={0} max={100} step={0.01} />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Invoice notes..." rows={2}
                className="flex w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#5C4033]/60 focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card className="mt-4 border-[#E8DCC8]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle style={{ color: '#2C1810' }}>Line Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Line</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium" style={{ color: '#5C4033' }}>
              <div className="col-span-2">Product</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1"></div>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-2">
                  <select value={line.product_id || ''} onChange={(e) => selectProduct(i, e.target.value)} className={selectCls}>
                    <option value="">-- None --</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
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
                    <Trash2 className="h-4 w-4" style={{ color: '#E07A5F' }} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t pt-4 text-right" style={{ borderColor: '#E8DCC8' }}>
            <div className="flex justify-end gap-8 text-sm">
              <span style={{ color: '#5C4033' }}>Subtotal:</span>
              <span className="w-28 font-mono">${subtotal.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-end gap-8 text-sm">
                <span style={{ color: '#5C4033' }}>Tax ({taxRate}%):</span>
                <span className="w-28 font-mono">${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-end gap-8 text-lg font-bold">
              <span style={{ color: '#2C1810' }}>Total:</span>
              <span className="w-28 font-mono">${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex gap-3">
        <Button variant="outline" onClick={() => save(false)} disabled={loading}>{loading ? 'Saving...' : 'Save as Draft'}</Button>
        <Button onClick={() => save(true)} disabled={loading}>{loading ? 'Saving...' : 'Save & Send'}</Button>
      </div>
    </Shell>
  );
}
