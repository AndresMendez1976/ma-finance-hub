// New expense form
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

// Expense categories mapping to typical account codes
const CATEGORIES = [
  'Rent', 'Utilities', 'Salaries & Wages', 'Insurance', 'Office Supplies',
  'Marketing & Advertising', 'Professional Fees', 'Software & Technology',
  'Travel', 'Meals & Entertainment', 'Repairs & Maintenance', 'Bank Fees',
  'Interest', 'Depreciation', 'Taxes & Licenses', 'Other',
];

interface Account { id: number; account_code: string; name: string; account_type: string }

export default function NewExpensePage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    api.get<Account[]>('/accounts').then(setAccounts).catch(() => {});
  }, []);

  const expenseAccounts = accounts.filter((a) => a.account_type === 'expense');
  const paymentAccounts = accounts.filter((a) => ['asset'].includes(a.account_type) && parseInt(a.account_code) < 1500);

  const save = async () => {
    if (!vendorName || !date || !category || !accountId || !amount) {
      setError('Vendor, date, category, account, and amount are required'); return;
    }
    setLoading(true); setError('');
    try {
      await api.post('/expenses', {
        date, vendor_name: vendorName, category, account_id: parseInt(accountId, 10),
        payment_account_id: paymentAccountId ? parseInt(paymentAccountId, 10) : undefined,
        amount: parseFloat(amount), description: description || undefined, reference: reference || undefined,
      });
      router.push('/expenses');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Expense</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      <Card className="border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Expense Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Date *</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Vendor *</label>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]">
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Expense Account *</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]">
                <option value="">Select account</option>
                {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Payment Account</label>
              <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]">
                <option value="">Select payment account</option>
                {paymentAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Amount *</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step={0.01} min={0.01} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Reference</label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt # or vendor invoice #" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[#5C4033]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?"
              className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033] placeholder:text-[#8B7355]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" rows={3} />
          </div>
          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
