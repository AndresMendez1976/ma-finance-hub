'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

interface BudgetLine { account_id: string; period_start: string; period_end: string; amount: string }

export default function NewBudgetPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [fiscalYear, setFiscalYear] = useState('2026');
  const [periodType, setPeriodType] = useState('monthly');
  const [lines, setLines] = useState<BudgetLine[]>([{ account_id: '', period_start: '', period_end: '', amount: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addLine = () => setLines((p) => [...p, { account_id: '', period_start: '', period_end: '', amount: '' }]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));
  const setLine = (i: number, k: keyof BudgetLine, v: string) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/budgets', {
        name, fiscal_year: Number(fiscalYear), period_type: periodType,
        lines: lines.filter((l) => l.account_id && l.amount).map((l) => ({
          account_id: Number(l.account_id), period_start: l.period_start,
          period_end: l.period_end, amount: Number(l.amount),
        })),
      });
      router.push('/budgets');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Budget</h1>
      {error && <div className="mb-3 rounded-md bg-[#E07A5F]/10 p-2 text-sm text-[#E07A5F]">{error}</div>}
      <Card className="mb-6">
        <CardHeader><CardTitle>Budget Info</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Budget name" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Fiscal Year</label>
              <Input type="number" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Period Type</label>
              <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Budget Lines</CardTitle>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-4 w-4" />Add Line</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[#8B7355]">Account ID</label>
                  <Input type="number" value={line.account_id} onChange={(e) => setLine(i, 'account_id', e.target.value)} placeholder="Account" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[#8B7355]">Period Start</label>
                  <Input type="date" value={line.period_start} onChange={(e) => setLine(i, 'period_start', e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[#8B7355]">Period End</label>
                  <Input type="date" value={line.period_end} onChange={(e) => setLine(i, 'period_end', e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[#8B7355]">Amount</label>
                  <Input type="number" value={line.amount} onChange={(e) => setLine(i, 'amount', e.target.value)} placeholder="0.00" />
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length <= 1}><Trash2 className="h-4 w-4 text-[#E07A5F]" /></Button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Budget'}</Button>
            <Button variant="outline" onClick={() => router.push('/budgets')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
