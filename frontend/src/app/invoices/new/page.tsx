'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Plus, Trash2, UserPlus } from 'lucide-react';

interface Contact { id: number; display_name: string; email: string | null; billing_address: string | null; type: string }
interface Product { id: number; name: string; description: string; unit_price: number }
interface TaxRate { id: number; name: string; rate: number }
interface Project { id: number; name: string }
interface InvoiceLine { description: string; quantity: number; unit_price: number; account_id?: number; product_id?: string }

const PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];
const DISCOUNT_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount ($)' },
];

const selectCls = 'flex h-10 w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]';
const textareaCls = 'flex w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#5C4033]/60 focus-visible:ring-2 focus-visible:ring-[#2D6A4F]';

export default function NewInvoicePage() {
  const router = useRouter();

  // Customer state
  const [contactId, setContactId] = useState<number | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Details state
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [taxRateId, setTaxRateId] = useState<number | null>(null);
  const [taxRatePercent, setTaxRatePercent] = useState(0);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [internalMemo, setInternalMemo] = useState('');
  const [notes, setNotes] = useState('');

  // Line items
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: '', quantity: 1, unit_price: 0 }]);

  // Totals
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);

  // Reference data
  const [products, setProducts] = useState<Product[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch reference data
  useEffect(() => {
    api.get<Contact[]>('/contacts?type=customer&limit=200').then((r: unknown) => setContacts(extractArray(r))).catch(() => {});
    api.get<Product[]>('/products').then((r: unknown) => setProducts(extractArray(r))).catch(() => {});
    api.get<TaxRate[]>('/tax-rates').then((r: unknown) => setTaxRates(extractArray(r))).catch(() => {});
    api.get<Project[]>('/projects').then((r: unknown) => setProjects(extractArray(r))).catch(() => {});
  }, []);

  // Auto-set due date on initial payment terms
  useEffect(() => {
    applyTerms('Net 30');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered contacts for search
  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter((c) => c.display_name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q)));
  }, [contacts, contactSearch]);

  // Contact selection
  const selectContact = (id: string) => {
    if (!id) {
      setContactId(null);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerAddress('');
      return;
    }
    const contact = contacts.find((c) => String(c.id) === id);
    if (contact) {
      setContactId(contact.id);
      setCustomerName(contact.display_name);
      setCustomerEmail(contact.email || '');
      setCustomerAddress(contact.billing_address || '');
    }
  };

  // Payment terms logic
  const applyTerms = (terms: string) => {
    setPaymentTerms(terms);
    if (!issueDate) return;
    const base = new Date(issueDate);
    const days = terms === 'Due on Receipt' ? 0 : parseInt(terms.replace('Net ', ''), 10);
    base.setDate(base.getDate() + days);
    setDueDate(base.toISOString().slice(0, 10));
  };

  // Tax rate selection
  const selectTaxRate = (id: string) => {
    if (!id) {
      setTaxRateId(null);
      setTaxRatePercent(0);
      return;
    }
    const tr = taxRates.find((t) => String(t.id) === id);
    if (tr) {
      setTaxRateId(tr.id);
      setTaxRatePercent(tr.rate);
    }
  };

  // Line item operations
  const lineAmounts = lines.map((l) => Math.round(l.quantity * l.unit_price * 100) / 100);
  const subtotal = lineAmounts.reduce((s, a) => s + a, 0);

  const discountAmount = discountType === 'percentage'
    ? Math.round(subtotal * discountValue / 100 * 100) / 100
    : discountType === 'fixed' ? Math.round(discountValue * 100) / 100 : 0;

  const taxable = Math.round((subtotal - discountAmount) * 100) / 100;
  const taxAmount = Math.round(taxable * (taxRatePercent / 100) * 100) / 100;
  const total = Math.round((taxable + taxAmount + shippingAmount) * 100) / 100;

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

  // Save
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
        tax_rate: taxRatePercent,
        notes: notes || undefined,
        contact_id: contactId || undefined,
        tax_rate_id: taxRateId || undefined,
        project_id: projectId || undefined,
        internal_memo: internalMemo || undefined,
        po_number: poNumber || undefined,
        payment_terms: paymentTerms || undefined,
        shipping_amount: shippingAmount,
        discount_type: discountType,
        discount_value: discountValue,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          account_id: l.account_id || undefined,
          product_id: l.product_id ? parseInt(l.product_id, 10) : undefined,
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
        {/* Section 1 — Customer */}
        <Card className="border-[#E8DCC8]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle style={{ color: '#2C1810' }}>Customer</CardTitle>
            <Link href="/contacts/new" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#2D6A4F' }}>
              <UserPlus className="h-3.5 w-3.5" /> New Customer
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Select Contact</label>
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                className={`${selectCls} mb-1`}
              />
              <select
                value={contactId ? String(contactId) : ''}
                onChange={(e) => selectContact(e.target.value)}
                className={selectCls}
              >
                <option value="">-- Select Customer --</option>
                {filteredContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.display_name}{c.email ? ` (${c.email})` : ''}</option>
                ))}
              </select>
            </div>

            {contactId && (
              <div className="rounded-md p-3 text-sm" style={{ backgroundColor: '#FAF6F0', borderColor: '#E8DCC8', border: '1px solid #E8DCC8' }}>
                <p className="font-medium" style={{ color: '#2C1810' }}>Bill To:</p>
                <p style={{ color: '#5C4033' }}>{customerName}</p>
                {customerEmail && <p style={{ color: '#5C4033' }}>{customerEmail}</p>}
                {customerAddress && <p className="whitespace-pre-line" style={{ color: '#5C4033' }}>{customerAddress}</p>}
              </div>
            )}

            {!contactId && (
              <>
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
                  <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Billing address" rows={3} className={textareaCls} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 2 — Details */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle style={{ color: '#2C1810' }}>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Invoice Date *</label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Due Date *</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Payment Terms</label>
                <select value={paymentTerms} onChange={(e) => applyTerms(e.target.value)} className={selectCls}>
                  {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>PO / Reference</label>
                <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-12345" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Tax Rate</label>
                <select
                  value={taxRateId ? String(taxRateId) : ''}
                  onChange={(e) => selectTaxRate(e.target.value)}
                  className={selectCls}
                >
                  <option value="">No Tax</option>
                  {taxRates.map((tr) => (
                    <option key={tr.id} value={tr.id}>{tr.name} ({tr.rate}%)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Project</label>
                <select
                  value={projectId ? String(projectId) : ''}
                  onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className={selectCls}
                >
                  <option value="">-- None --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Internal Memo</label>
              <textarea value={internalMemo} onChange={(e) => setInternalMemo(e.target.value)} placeholder="Internal notes (not shown on PDF)..." rows={2} className={textareaCls} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3 — Line Items */}
      <Card className="mt-4 border-[#E8DCC8]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle style={{ color: '#2C1810' }}>Line Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine} className="border-[#E8DCC8]"><Plus className="mr-1 h-3 w-3" />Add Line</Button>
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
                <div className="col-span-2 text-right font-mono text-sm">{formatCurrency(lineAmounts[i])}</div>
                <div className="col-span-1">
                  <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length <= 1}>
                    <Trash2 className="h-4 w-4" style={{ color: '#E07A5F' }} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Section 4 — Totals */}
          <div className="mt-6 border-t pt-4" style={{ borderColor: '#E8DCC8' }}>
            <div className="flex flex-col items-end gap-2">
              {/* Subtotal */}
              <div className="flex items-center gap-4 text-sm">
                <span className="w-40 text-right" style={{ color: '#5C4033' }}>Subtotal:</span>
                <span className="w-32 text-right font-mono">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center gap-2 text-sm">
                <select
                  value={discountType}
                  onChange={(e) => { setDiscountType(e.target.value); if (e.target.value === 'none') setDiscountValue(0); }}
                  className="h-8 rounded-md border border-[#E8DCC8] bg-white px-2 text-xs text-[#2C1810]"
                >
                  {DISCOUNT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                {discountType !== 'none' && (
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    className="h-8 w-24 text-xs"
                  />
                )}
                {discountAmount > 0 && (
                  <span className="w-32 text-right font-mono text-sm" style={{ color: '#E07A5F' }}>-{formatCurrency(discountAmount)}</span>
                )}
              </div>

              {/* Tax */}
              {taxRatePercent > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-40 text-right" style={{ color: '#5C4033' }}>Tax ({taxRatePercent}%):</span>
                  <span className="w-32 text-right font-mono">{formatCurrency(taxAmount)}</span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex items-center gap-4 text-sm">
                <span className="w-40 text-right" style={{ color: '#5C4033' }}>Shipping:</span>
                <Input
                  type="number"
                  value={shippingAmount}
                  onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={0.01}
                  className="h-8 w-32 text-right font-mono text-xs"
                />
              </div>

              {/* Total */}
              <div className="mt-2 flex items-center gap-4 border-t pt-2 text-lg font-bold" style={{ borderColor: '#E8DCC8' }}>
                <span style={{ color: '#2C1810' }}>Total:</span>
                <span className="w-32 text-right font-mono" style={{ color: '#2D6A4F' }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Notes (shown on invoice)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Invoice notes..." rows={2} className={textareaCls} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <Button
          variant="outline"
          onClick={() => save(false)}
          disabled={loading}
          className="border-[#E8DCC8] text-[#2C1810]"
        >
          {loading ? 'Saving...' : 'Save as Draft'}
        </Button>
        <Button
          onClick={() => save(true)}
          disabled={loading}
          style={{ backgroundColor: '#2D6A4F' }}
          className="text-white hover:opacity-90"
        >
          {loading ? 'Saving...' : 'Save & Send'}
        </Button>
      </div>
    </Shell>
  );
}
