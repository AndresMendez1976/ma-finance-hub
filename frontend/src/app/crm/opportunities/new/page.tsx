'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewOpportunityPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    contact_id: '', pipeline_id: '', stage_id: '', title: '', value: '',
    currency: 'USD', expected_close_date: '', source: '', notes: '', assigned_to: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/crm/opportunities', {
        ...form,
        contact_id: Number(form.contact_id) || undefined,
        pipeline_id: Number(form.pipeline_id) || undefined,
        stage_id: Number(form.stage_id) || undefined,
        value: Number(form.value),
      });
      router.push('/crm');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Opportunity</h1>
      {error && <div className="mb-3 rounded-md bg-[#E07A5F]/10 p-2 text-sm text-[#E07A5F]">{error}</div>}
      <Card>
        <CardHeader><CardTitle>Opportunity Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Title</label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Deal title" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Contact ID</label>
              <Input type="number" value={form.contact_id} onChange={(e) => set('contact_id', e.target.value)} placeholder="Contact" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Pipeline ID</label>
              <Input type="number" value={form.pipeline_id} onChange={(e) => set('pipeline_id', e.target.value)} placeholder="Pipeline" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Stage ID</label>
              <Input type="number" value={form.stage_id} onChange={(e) => set('stage_id', e.target.value)} placeholder="Stage" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Value</label>
              <Input type="number" value={form.value} onChange={(e) => set('value', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Currency</label>
              <Input value={form.currency} onChange={(e) => set('currency', e.target.value)} placeholder="USD" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Expected Close Date</label>
              <Input type="date" value={form.expected_close_date} onChange={(e) => set('expected_close_date', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Source</label>
              <Input value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="e.g. Referral" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8B7355]">Assigned To</label>
              <Input value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} placeholder="User" />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-[#8B7355]">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className="w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]" />
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Opportunity'}</Button>
            <Button variant="outline" onClick={() => router.push('/crm')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
