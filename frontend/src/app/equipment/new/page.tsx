// New Equipment form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

const CATEGORIES = ['Heavy Equipment', 'Vehicles', 'Small Tools', 'Safety', 'Scaffolding', 'Electrical', 'Other'];
const STATUSES = ['available', 'assigned', 'maintenance', 'retired'];

export default function NewEquipmentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Heavy Equipment');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [year, setYear] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [status, setStatus] = useState('available');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name) { setError('Name is required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/equipment', {
        name, category, make: make || undefined, model: model || undefined,
        serial_number: serial || undefined, year: year ? parseInt(year) : undefined,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        daily_rate: dailyRate ? parseFloat(dailyRate) : undefined,
        monthly_rate: monthlyRate ? parseFloat(monthlyRate) : undefined, status,
      });
      router.push('/equipment');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">New Equipment</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Equipment Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className="text-sm font-medium text-[#2C1810]">Name *</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810]">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-[#2C1810]">Make</label><Input value={make} onChange={(e) => setMake(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Model</label><Input value={model} onChange={(e) => setModel(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-[#2C1810]">Serial #</label><Input value={serial} onChange={(e) => setSerial(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Year</label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium text-[#2C1810]">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810]">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Rates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className="text-sm font-medium text-[#2C1810]">Hourly Rate</label><Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} step="0.01" /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Daily Rate</label><Input type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} step="0.01" /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Monthly Rate</label><Input type="number" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} step="0.01" /></div>
            {hourlyRate && <p className="text-xs text-[#5C4033]">Rate: {formatCurrency(hourlyRate)}/hr | Created: {formatDate(new Date().toISOString())}</p>}
            <Button onClick={save} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Create Equipment'}</Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
