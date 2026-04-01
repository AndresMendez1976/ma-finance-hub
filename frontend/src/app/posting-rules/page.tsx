'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/use-api';
import { api, ApiError, extractArray } from '@/lib/api';
import { Zap } from 'lucide-react';

interface Rule { id: string; event_type: string; name: string; description: string | null; is_active: boolean }

export default function PostingRulesPage() {
  const { data, loading } = useApi<Rule[]>('/posting-rules');
  const [form, setForm] = useState({ event_type: '', amount: '', fiscal_period_id: '', reference: '' });
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [processing, setProcessing] = useState(false);

  const process = async () => {
    setProcessing(true); setErr(''); setResult(null);
    try {
      const res = await api.post('/posting-rules/process', {
        event_type: form.event_type, amount: Number(form.amount),
        fiscal_period_id: Number(form.fiscal_period_id), reference: form.reference || undefined,
      });
      setResult(JSON.stringify(res, null, 2));
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); }
    finally { setProcessing(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold">Posting Rules</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Active Rules</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p>Loading...</p> : (
              <Table>
                <THead><TR><TH>Event</TH><TH>Name</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {data?.map((r) => (
                    <TR key={r.id}><TD className="font-mono text-sm">{r.event_type}</TD><TD>{r.name}</TD>
                      <TD><Badge variant={r.is_active ? 'success' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TD></TR>
                  ))}
                  {(!data || data.length === 0) && <TR><TD colSpan={3} className="text-center text-muted-foreground">No rules defined</TD></TR>}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Process Event</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Event type (e.g. invoice.created)" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
            <Input placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input placeholder="Fiscal Period ID" value={form.fiscal_period_id} onChange={(e) => setForm({ ...form, fiscal_period_id: e.target.value })} />
            <Input placeholder="Reference (optional)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button onClick={process} disabled={processing}><Zap className="mr-2 h-4 w-4" />{processing ? 'Processing...' : 'Process'}</Button>
            {result && <pre className="mt-3 max-h-60 overflow-auto rounded bg-muted p-3 text-xs">{result}</pre>}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
