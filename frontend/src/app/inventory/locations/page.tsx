// Inventory locations list with inline create form
'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, extractArray } from '@/lib/api';
import { Plus } from 'lucide-react';

interface Location { id: number; name: string; address: string | null; is_default: boolean }

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [init, setInit] = useState(true);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setLocations(extractArray(await api.get<unknown>('/inventory/locations'))); setInit(false); }
    catch { /* */ }
    finally { setLoading(false); }
  }, []);

  if (init && !loading) { void load(); }

  const create = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/inventory/locations', { name: name.trim(), address: address.trim() || undefined, is_default: isDefault });
      setName(''); setAddress(''); setIsDefault(false);
      await load();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">Inventory Locations</h1>

      {/* Inline create form */}
      <Card className="mb-4 border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Add Location</CardTitle></CardHeader>
        <CardContent>
          {error && <div className="mb-3 rounded-md bg-[#E07A5F]/10 p-2 text-sm text-[#E07A5F]">{error}</div>}
          <div className="flex flex-wrap items-end gap-3">
            <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse A" className="w-48" /></div>
            <div><label className="mb-1 block text-xs font-medium text-[#8B7355]">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className="w-64" /></div>
            <label className="flex items-center gap-2 text-sm text-[#5C4033]">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />Default
            </label>
            <Button onClick={create} disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Add'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Locations list */}
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>Name</TH><TH>Address</TH><TH>Default</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={3} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && locations.map((loc) => (
                <TR key={loc.id}>
                  <TD className="font-medium">{loc.name}</TD>
                  <TD className="text-sm text-[#8B7355]">{loc.address || '—'}</TD>
                  <TD>{loc.is_default && <Badge variant="success">Default</Badge>}</TD>
                </TR>
              ))}
              {!loading && !locations.length && <TR><TD colSpan={3} className="text-center text-[#8B7355]">No locations yet</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
