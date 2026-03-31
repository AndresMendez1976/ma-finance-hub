// New Payroll Run form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function NewPayrollRunPage() {
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payDate, setPayDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!periodStart || !periodEnd || !payDate) { setError('Period start, end, and pay date are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post<{ id: number }>('/payroll', {
        period_start: periodStart, period_end: periodEnd, pay_date: payDate,
        notes: notes || undefined,
      });
      router.push(`/payroll/${res.id}`);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Payroll Run</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <Card className="max-w-lg border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Payroll Period</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#5C4033]">Period Start *</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-[#5C4033]">Period End *</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-[#5C4033]">Pay Date *</label>
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-[#5C4033]">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes..."
              className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033] placeholder:text-[#8B7355]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" />
          </div>
          <Button onClick={save} disabled={loading}>{loading ? 'Creating...' : 'Create Payroll Run'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
