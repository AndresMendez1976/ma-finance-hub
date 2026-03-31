'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [contactId, setContactId] = useState('');
  const [description, setDescription] = useState('');
  const [budgetType, setBudgetType] = useState('fixed');
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name) { setError('Project name is required'); return; }
    setLoading(true); setError('');
    try {
      const proj = await api.post<{ id: number }>('/projects', {
        name, contact_id: contactId || undefined, description: description || undefined,
        budget_type: budgetType, budget_amount: budgetAmount, hourly_rate: hourlyRate || undefined,
        start_date: startDate || undefined, end_date: endDate || undefined, notes: notes || undefined,
      });
      router.push(`/projects/${proj.id}`);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Project</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle>Project Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className="text-sm font-medium text-[#5C4033]">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Client (Contact ID)</label>
              <Input value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="Contact ID" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Project description..."
                className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033] placeholder:text-[#8B7355]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" rows={3} /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..."
                className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033] placeholder:text-[#8B7355]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" rows={2} /></div>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle>Budget & Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className="text-sm font-medium text-[#5C4033]">Budget Type</label>
              <select value={budgetType} onChange={(e) => setBudgetType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                <option value="fixed">Fixed</option><option value="hourly">Hourly</option><option value="non_billable">Non-Billable</option>
              </select></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Budget Amount</label>
              <Input type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(parseFloat(e.target.value) || 0)} min={0} step={0.01} /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Hourly Rate</label>
              <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} min={0} step={0.01} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-[#5C4033]">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#5C4033]">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex gap-3">
        <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Create Project'}</Button>
        <Button variant="outline" onClick={() => router.push('/projects')}>Cancel</Button>
      </div>
    </Shell>
  );
}
