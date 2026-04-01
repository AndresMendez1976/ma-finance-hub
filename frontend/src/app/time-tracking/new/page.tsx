'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function NewTimeEntryPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const computedMinutes = startTime && endTime
    ? Math.max(0, (new Date(`2000-01-01T${endTime}`).getTime() - new Date(`2000-01-01T${startTime}`).getTime()) / 60000)
    : durationMinutes;

  const save = async () => {
    if (!projectId || !date) { setError('Project and date are required'); return; }
    if (computedMinutes <= 0) { setError('Duration must be greater than 0'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/time-entries', {
        project_id: Number(projectId), date, duration_minutes: computedMinutes,
        start_time: startTime || undefined, end_time: endTime || undefined,
        description: description || undefined, billable, hourly_rate: hourlyRate || undefined,
      });
      router.push('/time-tracking');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">New Time Entry</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      <Card className="border-[#E8DCC8] max-w-xl">
        <CardHeader><CardTitle>Entry Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><label className="text-sm font-medium text-[#2C1810]">Project ID *</label>
            <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Project ID" /></div>
          <div><label className="text-sm font-medium text-[#2C1810]">Date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-[#2C1810]">Start Time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">End Time</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-medium text-[#2C1810]">Or Duration (minutes)</label>
            <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              min={0} disabled={!!(startTime && endTime)} /></div>
          {computedMinutes > 0 && (
            <p className="text-xs text-[#5C4033]">Duration: {(computedMinutes / 60).toFixed(1)} hours</p>
          )}
          <div><label className="text-sm font-medium text-[#2C1810]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you work on?"
              className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#5C4033]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" rows={2} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} id="billable"
              className="h-4 w-4 rounded border-[#D4C4A8]" />
            <label htmlFor="billable" className="text-sm text-[#2C1810]">Billable</label>
          </div>
          <div><label className="text-sm font-medium text-[#2C1810]">Hourly Rate</label>
            <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} min={0} step={0.01} /></div>
        </CardContent>
      </Card>

      <div className="mt-4 flex gap-3">
        <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Entry'}</Button>
        <Button variant="outline" onClick={() => router.push('/time-tracking')}>Cancel</Button>
      </div>
    </Shell>
  );
}
