'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewFixedAssetPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', description: '', category: '', serial_number: '', location: '',
    purchase_date: '', purchase_price: '', salvage_value: '', useful_life_months: '60',
    depreciation_method: 'straight_line', asset_account_id: '', depreciation_account_id: '', expense_account_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/fixed-assets', {
        ...form,
        purchase_price: Number(form.purchase_price),
        salvage_value: Number(form.salvage_value),
        useful_life_months: Number(form.useful_life_months),
        asset_account_id: Number(form.asset_account_id) || undefined,
        depreciation_account_id: Number(form.depreciation_account_id) || undefined,
        expense_account_id: Number(form.expense_account_id) || undefined,
      });
      router.push('/fixed-assets');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#8B7355]">{label}</label>
      <Input type={type} value={(form as Record<string, string>)[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
    </div>
  );

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Fixed Asset</h1>
      {error && <div className="mb-3 rounded-md bg-[#E07A5F]/10 p-2 text-sm text-[#E07A5F]">{error}</div>}
      <Card>
        <CardHeader><CardTitle>Asset Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {field('Name', 'name', 'text', 'Asset name')}
            {field('Category', 'category', 'text', 'e.g. Machinery')}
            {field('Serial Number', 'serial_number', 'text', 'S/N')}
            {field('Location', 'location', 'text', 'Building / Room')}
            {field('Purchase Date', 'purchase_date', 'date')}
            {field('Purchase Price', 'purchase_price', 'number', '0.00')}
            {field('Salvage Value', 'salvage_value', 'number', '0.00')}
            {field('Useful Life (months)', 'useful_life_months', 'number', '60')}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Depreciation Method</label>
              <select value={form.depreciation_method} onChange={(e) => set('depreciation_method', e.target.value)} className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                <option value="straight_line">Straight Line</option>
                <option value="declining_balance">Declining Balance</option>
                <option value="sum_of_years">Sum of Years Digits</option>
                <option value="units_of_production">Units of Production</option>
              </select>
            </div>
            {field('Asset Account ID', 'asset_account_id', 'number')}
            {field('Depreciation Account ID', 'depreciation_account_id', 'number')}
            {field('Expense Account ID', 'expense_account_id', 'number')}
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-[#8B7355]">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]" />
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Asset'}</Button>
            <Button variant="outline" onClick={() => router.push('/fixed-assets')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
