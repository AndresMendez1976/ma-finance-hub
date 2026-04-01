'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/use-api';
import { api, extractArray } from '@/lib/api';
import { Plus, Pencil, Check, X } from 'lucide-react';

interface Account { id: string; account_code: string; name: string; account_type: string; chart_id: string; parent_account_id: string | null; is_active: boolean }

export default function AccountsPage() {
  const { data, loading, refetch } = useApi<Account[]>('/accounts');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ chart_id: '', account_code: '', name: '', account_type: 'asset' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const create = async () => {
    setSaving(true); setErr(''); setSuccess('');
    try {
      await api.post('/accounts', { ...form, chart_id: Number(form.chart_id) });
      setForm({ chart_id: '', account_code: '', name: '', account_type: 'asset' });
      setShow(false); setSuccess('Account created'); refetch();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true); setErr(''); setSuccess('');
    try {
      await api.patch(`/accounts/${editId}`, { name: editName });
      setEditId(null); setSuccess('Account updated'); refetch();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Button size="sm" onClick={() => { setShow(!show); setSuccess(''); }}><Plus className="mr-2 h-4 w-4" />New Account</Button>
      </div>
      {success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}
      {err && <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
      {show && (
        <Card className="mb-4"><CardContent className="grid gap-3 pt-6 md:grid-cols-2">
          <Input placeholder="Chart ID" value={form.chart_id} onChange={(e) => setForm({ ...form, chart_id: e.target.value })} />
          <Input placeholder="Account Code" value={form.account_code} onChange={(e) => setForm({ ...form, account_code: e.target.value })} />
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="h-10 rounded-md border px-3 text-sm" value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>
            {['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="col-span-2 flex gap-2"><Button size="sm" onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
            <Button size="sm" variant="outline" onClick={() => setShow(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}
      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <Table>
          <THead><TR><TH>Code</TH><TH>Name</TH><TH>Type</TH><TH>Chart</TH><TH>Status</TH><TH></TH></TR></THead>
          <TBody>
            {data?.map((a) => (
              <TR key={a.id}>
                <TD className="font-mono">{a.account_code}</TD>
                <TD>{editId === a.id ? <Input className="h-8" value={editName} onChange={(e) => setEditName(e.target.value)} /> : a.name}</TD>
                <TD><Badge variant="outline">{a.account_type}</Badge></TD>
                <TD>{a.chart_id}</TD>
                <TD><Badge variant={a.is_active ? 'success' : 'secondary'}>{a.is_active ? 'Active' : 'Inactive'}</Badge></TD>
                <TD>
                  {editId === a.id ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit} disabled={saving}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditId(a.id); setEditName(a.name); }}><Pencil className="h-4 w-4" /></Button>
                  )}
                </TD>
              </TR>
            ))}
            {(!data || data.length === 0) && <TR><TD colSpan={6} className="text-center text-muted-foreground">No accounts</TD></TR>}
          </TBody>
        </Table>
      )}
    </Shell>
  );
}
