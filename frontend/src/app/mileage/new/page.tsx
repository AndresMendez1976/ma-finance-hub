// New Mileage entry form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

export default function NewMileagePage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [distance, setDistance] = useState('');
  const [rate, setRate] = useState('0.70');
  const [roundTrip, setRoundTrip] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveMiles = roundTrip ? Number(distance) * 2 : Number(distance);
  const amount = effectiveMiles * Number(rate);

  const save = async () => {
    if (!description || !distance) { setError('Description and distance are required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/mileage', {
        date, description, distance: parseFloat(distance),
        rate: parseFloat(rate), round_trip: roundTrip,
        project_id: projectId ? parseInt(projectId) : undefined,
        vehicle: vehicle || undefined,
      });
      router.push('/mileage');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">Log Mileage</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <Card className="max-w-lg border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Trip Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><label className="text-sm font-medium text-[#5C4033]">Date</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="text-sm font-medium text-[#5C4033]">Description *</label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Client site visit — ABC Corp" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-[#5C4033]">Distance (miles) *</label><Input type="number" value={distance} onChange={(e) => setDistance(e.target.value)} step="0.1" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Rate ($/mile)</label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} step="0.01" /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="roundTrip" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)}
              className="h-4 w-4 rounded border-[#D4C4A8] text-[#2D6A4F] focus:ring-[#2D6A4F]" />
            <label htmlFor="roundTrip" className="text-sm text-[#5C4033]">Round trip (doubles distance)</label>
          </div>
          <div><label className="text-sm font-medium text-[#5C4033]">Project ID (optional)</label><Input type="number" value={projectId} onChange={(e) => setProjectId(e.target.value)} /></div>
          <div><label className="text-sm font-medium text-[#5C4033]">Vehicle</label><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="e.g. 2024 Toyota Tacoma" /></div>
          {distance && (
            <div className="rounded-md bg-[#E8DCC8]/30 p-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Date</span><span>{formatDate(date)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Effective Miles</span><span className="font-mono">{effectiveMiles}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Rate</span><span className="font-mono">{formatCurrency(rate)}/mi</span></div>
              <div className="flex justify-between text-sm font-bold border-t border-[#E8DCC8] pt-1"><span>Deduction</span><span className="font-mono">{formatCurrency(amount)}</span></div>
            </div>
          )}
          <Button onClick={save} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Log Mileage'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
