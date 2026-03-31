'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewMaintenancePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    asset_id: '', type: 'preventive', title: '', description: '',
    scheduled_date: '', cost: '', assigned_to: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/maintenance', {
        ...form,
        asset_id: Number(form.asset_id),
        cost: Number(form.cost) || 0,
      });
      router.push('/maintenance');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Maintenance Record</h1>
      {error && <div className="mb-3 rounded-md bg-[#E07A5F]/10 p-2 text-sm text-[#E07A5F]">{error}</div>}
      <Card>
        <CardHeader><CardTitle>Maintenance Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Asset ID</label>
              <Input type="number" value={form.asset_id} onChange={(e) => set('asset_id', e.target.value)} placeholder="Asset ID" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Type</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="inspection">Inspection</option>
                <option value="replacement">Replacement</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Title</label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Maintenance title" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Scheduled Date</label>
              <Input type="date" value={form.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Cost</label>
              <Input type="number" value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Assigned To</label>
              <Input value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} placeholder="Person or team" />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-[#8B7355]">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]" />
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Record'}</Button>
            <Button variant="outline" onClick={() => router.push('/maintenance')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
