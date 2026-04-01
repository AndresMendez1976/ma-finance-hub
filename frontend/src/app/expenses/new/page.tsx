'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';

const CATEGORIES = [
  'Rent', 'Utilities', 'Salaries & Wages', 'Insurance', 'Office Supplies',
  'Marketing & Advertising', 'Professional Fees', 'Software & Technology',
  'Travel', 'Meals & Entertainment', 'Repairs & Maintenance', 'Bank Fees',
  'Interest', 'Depreciation', 'Taxes & Licenses', 'Other',
];
const PAYMENT_METHODS = ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Other'];

interface Account { id: number; account_code: string; name: string; account_type: string }
interface Project { id: number; name: string }

const selectCls = 'flex h-10 w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]';

export default function NewExpensePage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [projectId, setProjectId] = useState('');
  const [billable, setBillable] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.get<Account[]>('/accounts').then((r: unknown) => setAccounts(extractArray(r))).catch(() => {});
    api.get<Project[]>('/projects').then((r: unknown) => setProjects(extractArray(r))).catch(() => {});
  }, []);

  const expenseAccounts = accounts.filter((a) => a.account_type === 'expense');
  const paymentAccounts = accounts.filter((a) => ['asset'].includes(a.account_type) && parseInt(a.account_code) < 1500);
  const bankAccounts = accounts.filter((a) => a.account_type === 'asset' && (a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('checking') || a.name.toLowerCase().includes('savings')));

  const save = async () => {
    if (!vendorName || !date || !category || !accountId || !amount) {
      setError('Vendor, date, category, account, and amount are required'); return;
    }
    setLoading(true); setError('');
    try {
      await api.post('/expenses', {
        date, vendor_name: vendorName, category, account_id: parseInt(accountId, 10),
        payment_account_id: paymentAccountId ? parseInt(paymentAccountId, 10) : undefined,
        payment_method: paymentMethod || undefined,
        bank_account_id: bankAccountId ? parseInt(bankAccountId, 10) : undefined,
        amount: parseFloat(amount), description: description || undefined,
        reference: reference || undefined,
        project_id: projectId ? parseInt(projectId, 10) : undefined,
        billable: billable || undefined,
        receipt_url: receiptUrl || undefined,
      });
      router.push('/expenses');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold" style={{ color: '#2C1810' }}>New Expense</h1>
      {error && <div className="mb-4 rounded-md p-3 text-sm" style={{ backgroundColor: '#E07A5F20', color: '#E07A5F' }}>{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle style={{ color: '#2C1810' }}>Expense Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Date *</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Vendor *</label>
                <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Expense Account *</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={selectCls}>
                  <option value="">Select account</option>
                  {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Amount *</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step={0.01} min={0.01} placeholder="0.00" />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Reference</label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt # or invoice #" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?" rows={3}
                className="flex w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#5C4033]/60 focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle style={{ color: '#2C1810' }}>Payment & Tracking</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={selectCls}>
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Payment Account</label>
                <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className={selectCls}>
                  <option value="">Select account</option>
                  {paymentAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Bank Account</label>
              <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className={selectCls}>
                <option value="">Select bank account</option>
                {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectCls}>
                <option value="">No project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm" style={{ color: '#2C1810' }}>
                <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)}
                  className="h-4 w-4 rounded border-[#C4B5A0]" />
                Billable to client
              </label>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Receipt URL</label>
              <Input value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex gap-3">
        <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</Button>
        <Button variant="outline" onClick={() => router.push('/expenses')}>Cancel</Button>
      </div>
    </Shell>
  );
}
