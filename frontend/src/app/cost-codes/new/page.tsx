// New Cost Code form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

const CATEGORIES = ['Labor', 'Material', 'Equipment', 'Subcontractor', 'Overhead', 'Other'];

export default function NewCostCodePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Labor');
  const [unit, setUnit] = useState('');
  const [defaultCost, setDefaultCost] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!code || !name) { setError('Code and name are required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/cost-codes', {
        code, name, category, unit: unit || undefined,
        default_cost: defaultCost ? parseFloat(defaultCost) : undefined,
        parent_id: parentId ? parseInt(parentId) : undefined,
      });
      router.push('/cost-codes');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">New Cost Code</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <Card className="max-w-lg border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#2C1810]">Cost Code Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-[#2C1810]">Code *</label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 03-100" /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Name *</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-medium text-[#2C1810]">Category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810]">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-[#2C1810]">Unit</label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. HR, CY, LF" /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Default Cost</label><Input type="number" value={defaultCost} onChange={(e) => setDefaultCost(e.target.value)} step="0.01" /></div>
          </div>
          <div><label className="text-sm font-medium text-[#2C1810]">Parent Cost Code ID</label><Input type="number" value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder="Leave blank for top-level" /></div>
          {defaultCost && <p className="text-xs text-[#5C4033]">Default cost: {formatCurrency(defaultCost)} | Created: {formatDate(new Date().toISOString())}</p>}
          <Button onClick={save} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Create Cost Code'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
