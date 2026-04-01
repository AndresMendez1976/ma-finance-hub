// New Recurring Expense form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'];

export default function NewRecurringExpensePage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!description || !amount || !vendorId) { setError('Vendor, description, and amount are required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/recurring-expenses', {
        vendor_id: parseInt(vendorId), description, amount: parseFloat(amount),
        account_id: accountId ? parseInt(accountId) : undefined,
        category: category || undefined, frequency,
        start_date: startDate, end_date: endDate || undefined,
      });
      router.push('/recurring-expenses');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Recurring Expense</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <Card className="max-w-lg border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Expense Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><label className="text-sm font-medium text-[#5C4033]">Vendor ID *</label><Input value={vendorId} onChange={(e) => setVendorId(e.target.value)} type="number" /></div>
          <div><label className="text-sm font-medium text-[#5C4033]">Description *</label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-[#5C4033]">Amount *</label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Account ID</label><Input type="number" value={accountId} onChange={(e) => setAccountId(e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-medium text-[#5C4033]">Category</label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Utilities, Rent, Insurance" /></div>
          <div><label className="text-sm font-medium text-[#5C4033]">Frequency *</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]">
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-[#5C4033]">Start Date</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">End Date</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="Optional" /></div>
          </div>
          {amount && <p className="text-xs text-[#8B7355]">{formatCurrency(amount)} {frequency} starting {formatDate(startDate)}</p>}
          <Button onClick={save} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Create Recurring Expense'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
