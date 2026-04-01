'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/use-api';
import { api, ApiError, extractArray } from '@/lib/api';
import { Plus, Download, Eye } from 'lucide-react';

interface JournalEntry { id: string; entry_number: number; reference: string | null; memo: string | null; status: string; posted_at: string | null; fiscal_period_id: string; created_at: string; lines?: { account_id: string; debit: string; credit: string; description: string | null }[] }

export default function JournalPage() {
  const { data, loading, refetch } = useApi<JournalEntry[]>('/journal-entries');
  const [detail, setDetail] = useState<JournalEntry | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fiscal_period_id: '', reference: '', memo: '', lines: [{ account_id: '', debit: '0', credit: '0' }, { account_id: '', debit: '0', credit: '0' }] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const viewDetail = async (id: string) => {
    const entry = await api.get<JournalEntry>(`/journal-entries/${id}`);
    setDetail(entry);
  };

  const postEntry = async (id: string) => {
    try { await api.post(`/journal-entries/${id}/post`); refetch(); setDetail(null); } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); }
  };

  const voidEntry = async (id: string) => {
    const reason = prompt('Reason for void:');
    if (!reason) return;
    try { await api.post(`/journal-entries/${id}/void`, { reason }); refetch(); setDetail(null); } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); }
  };

  const create = async () => {
    setSaving(true); setErr('');
    try {
      await api.post('/journal-entries', {
        fiscal_period_id: Number(form.fiscal_period_id),
        reference: form.reference || undefined,
        memo: form.memo || undefined,
        lines: form.lines.map((l) => ({ account_id: Number(l.account_id), debit: Number(l.debit), credit: Number(l.credit) })),
      });
      setShowCreate(false); refetch();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const exportEntries = () => { window.open('/api/v1/journal-entries/export', '_blank'); };

  const addLine = () => setForm({ ...form, lines: [...form.lines, { account_id: '', debit: '0', credit: '0' }] });

  const statusColor = (s: string) => s === 'posted' ? 'success' : s === 'voided' ? 'destructive' : 'warning';

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journal Entries</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportEntries}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}><Plus className="mr-2 h-4 w-4" />New Entry</Button>
        </div>
      </div>
      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}
      {showCreate && (
        <Card className="mb-4">
          <CardHeader><CardTitle>New Journal Entry</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Fiscal Period ID" value={form.fiscal_period_id} onChange={(e) => setForm({ ...form, fiscal_period_id: e.target.value })} />
              <Input placeholder="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              <Input placeholder="Memo" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
            </div>
            <p className="text-sm font-medium">Lines</p>
            {form.lines.map((line, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <Input placeholder="Account ID" value={line.account_id} onChange={(e) => { const lines = [...form.lines]; lines[i] = { ...line, account_id: e.target.value }; setForm({ ...form, lines }); }} />
                <Input placeholder="Debit" type="number" value={line.debit} onChange={(e) => { const lines = [...form.lines]; lines[i] = { ...line, debit: e.target.value }; setForm({ ...form, lines }); }} />
                <Input placeholder="Credit" type="number" value={line.credit} onChange={(e) => { const lines = [...form.lines]; lines[i] = { ...line, credit: e.target.value }; setForm({ ...form, lines }); }} />
              </div>
            ))}
            <div className="flex gap-2"><Button size="sm" variant="outline" onClick={addLine}>+ Line</Button>
              <Button size="sm" onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      )}
      {detail && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Entry #{detail.entry_number} — {detail.reference || detail.id}</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2">
              <Badge variant={statusColor(detail.status)}>{detail.status}</Badge>
              {detail.status === 'draft' && <Button size="sm" onClick={() => postEntry(detail.id)}>Post</Button>}
              {detail.status === 'posted' && <Button size="sm" variant="destructive" onClick={() => voidEntry(detail.id)}>Void</Button>}
              <Button size="sm" variant="outline" onClick={() => setDetail(null)}>Close</Button>
            </div>
            <Table>
              <THead><TR><TH>Account</TH><TH className="text-right">Debit</TH><TH className="text-right">Credit</TH><TH>Description</TH></TR></THead>
              <TBody>
                {detail.lines?.map((l, i) => (
                  <TR key={i}><TD>{l.account_id}</TD><TD className="text-right font-mono">{Number(l.debit).toFixed(2)}</TD>
                    <TD className="text-right font-mono">{Number(l.credit).toFixed(2)}</TD><TD>{l.description || '—'}</TD></TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {loading ? <p>Loading...</p> : (
        <Table>
          <THead><TR><TH>#</TH><TH>Reference</TH><TH>Status</TH><TH>Period</TH><TH>Date</TH><TH></TH></TR></THead>
          <TBody>
            {data?.map((e) => (
              <TR key={e.id}><TD>{e.entry_number}</TD><TD>{e.reference || '—'}</TD>
                <TD><Badge variant={statusColor(e.status)}>{e.status}</Badge></TD>
                <TD>{e.fiscal_period_id}</TD><TD className="text-sm">{new Date(e.created_at).toLocaleDateString()}</TD>
                <TD><Button size="sm" variant="ghost" onClick={() => viewDetail(e.id)}><Eye className="h-4 w-4" /></Button></TD></TR>
            ))}
            {(!data || data.length === 0) && <TR><TD colSpan={6} className="text-center text-muted-foreground">No entries</TD></TR>}
          </TBody>
        </Table>
      )}
    </Shell>
  );
}
