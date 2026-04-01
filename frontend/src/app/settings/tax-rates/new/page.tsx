'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

interface TaxComponent { name: string; rate: string; jurisdiction_level: string }

const JURISDICTION_LEVELS = ['federal', 'state', 'county', 'city', 'special'];

export default function NewTaxRatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [rate, setRate] = useState('');
  const [isCompound, setIsCompound] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [components, setComponents] = useState<TaxComponent[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addComponent = () => setComponents((p) => [...p, { name: '', rate: '', jurisdiction_level: 'state' }]);
  const removeComponent = (i: number) => setComponents((p) => p.filter((_, idx) => idx !== i));
  const setComp = (i: number, k: keyof TaxComponent, v: string) =>
    setComponents((p) => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/settings/tax-rates', {
        name, jurisdiction, rate: Number(rate), is_compound: isCompound,
        is_default: isDefault, effective_date: effectiveDate || null,
        components: components.filter((c) => c.name && c.rate).map((c) => ({
          name: c.name, rate: Number(c.rate), jurisdiction_level: c.jurisdiction_level,
        })),
      });
      router.push('/settings');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">New Tax Rate</h1>
      {error && <div className="mb-3 rounded-md bg-[#E07A5F]/10 p-2 text-sm text-[#E07A5F]">{error}</div>}
      <Card className="mb-6 border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#2C1810]">Tax Rate Info</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Tax" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Jurisdiction</label>
              <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="e.g. California" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Rate (%)</label>
              <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Effective Date</label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-6 pt-5">
              <label className="flex items-center gap-2 text-sm text-[#2C1810]">
                <input type="checkbox" checked={isCompound} onChange={(e) => setIsCompound(e.target.checked)} className="h-4 w-4 rounded border-[#D4C4A8]" />
                Compound
              </label>
              <label className="flex items-center gap-2 text-sm text-[#2C1810]">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 rounded border-[#D4C4A8]" />
                Default
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#2C1810]">Components</CardTitle>
            <Button size="sm" variant="outline" onClick={addComponent}><Plus className="mr-1 h-4 w-4" />Add Component</Button>
          </div>
        </CardHeader>
        <CardContent>
          {components.length === 0 && <p className="text-sm text-[#5C4033]">No components added. Click Add Component to break down the tax rate.</p>}
          <div className="space-y-3">
            {components.map((comp, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[#5C4033]">Name</label>
                  <Input value={comp.name} onChange={(e) => setComp(i, 'name', e.target.value)} placeholder="Component name" />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs font-medium text-[#5C4033]">Rate (%)</label>
                  <Input type="number" step="0.01" value={comp.rate} onChange={(e) => setComp(i, 'rate', e.target.value)} placeholder="0.00" />
                </div>
                <div className="w-36">
                  <label className="mb-1 block text-xs font-medium text-[#5C4033]">Level</label>
                  <select value={comp.jurisdiction_level} onChange={(e) => setComp(i, 'jurisdiction_level', e.target.value)} className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#2C1810]">
                    {JURISDICTION_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                  </select>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeComponent(i)}><Trash2 className="h-4 w-4 text-[#E07A5F]" /></Button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Tax Rate'}</Button>
            <Button variant="outline" onClick={() => router.push('/settings')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
