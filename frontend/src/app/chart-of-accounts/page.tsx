'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/use-api';
import { api, extractArray } from '@/lib/api';
import { Plus, Pencil, Check, X } from 'lucide-react';

interface Chart { id: string; name: string; description: string | null; is_active: boolean }

export default function ChartOfAccountsPage() {
  const { data, loading, refetch } = useApi<Chart[]>('/chart-of-accounts');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const create = async () => {
    setSaving(true); setErr(''); setSuccess('');
    try {
      await api.post('/chart-of-accounts', { name, description: desc || undefined });
      setName(''); setDesc(''); setShowForm(false); setSuccess('Chart created'); refetch();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const startEdit = (c: Chart) => { setEditId(c.id); setEditName(c.name); setEditDesc(c.description || ''); };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true); setErr(''); setSuccess('');
    try {
      await api.patch(`/chart-of-accounts/${editId}`, { name: editName, description: editDesc || undefined });
      setEditId(null); setSuccess('Chart updated'); refetch();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chart of Accounts</h1>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setSuccess(''); }}><Plus className="mr-2 h-4 w-4" />New Chart</Button>
      </div>
      {success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}
      {err && <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
      {showForm && (
        <Card className="mb-4"><CardContent className="space-y-3 pt-6">
          <Input placeholder="Chart name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <div className="flex gap-2"><Button size="sm" onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}
      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <Table>
          <THead><TR><TH>ID</TH><TH>Name</TH><TH>Description</TH><TH>Status</TH><TH></TH></TR></THead>
          <TBody>
            {data?.map((c) => (
              <TR key={c.id}>
                <TD>{c.id}</TD>
                <TD>{editId === c.id ? <Input className="h-8" value={editName} onChange={(e) => setEditName(e.target.value)} /> : <span className="font-medium">{c.name}</span>}</TD>
                <TD>{editId === c.id ? <Input className="h-8" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /> : (c.description || '—')}</TD>
                <TD><Badge variant={c.is_active ? 'success' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></TD>
                <TD>
                  {editId === c.id ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit} disabled={saving}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  )}
                </TD>
              </TR>
            ))}
            {(!data || data.length === 0) && <TR><TD colSpan={5} className="text-center text-muted-foreground">No charts found</TD></TR>}
          </TBody>
        </Table>
      )}
    </Shell>
  );
}
