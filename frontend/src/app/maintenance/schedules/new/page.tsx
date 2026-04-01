'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewMaintenanceSchedulePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    asset_id: '', title: '', frequency: 'monthly', next_due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/maintenance/schedules', {
        ...form,
        asset_id: Number(form.asset_id),
      });
      router.push('/maintenance/schedules');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">New Maintenance Schedule</h1>
      {error && <div className="mb-3 rounded-md bg-[#E07A5F]/10 p-2 text-sm text-[#E07A5F]">{error}</div>}
      <Card>
        <CardHeader><CardTitle>Schedule Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Asset ID</label>
              <Input type="number" value={form.asset_id} onChange={(e) => set('asset_id', e.target.value)} placeholder="Asset ID" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Title</label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Schedule title" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Frequency</label>
              <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)} className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#2C1810]">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Next Due Date</label>
              <Input type="date" value={form.next_due_date} onChange={(e) => set('next_due_date', e.target.value)} />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Schedule'}</Button>
            <Button variant="outline" onClick={() => router.push('/maintenance/schedules')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
