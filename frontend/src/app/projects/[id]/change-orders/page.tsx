// Change Orders — list + new form
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

interface ChangeOrder { id: number; co_number: string; description: string; amount: string; status: string; submitted_date: string; approved_date: string | null }

export default function ChangeOrdersPage() {
  const params = useParams();
  const id = params.id as string;
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [coNumber, setCoNumber] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get<{ data: ChangeOrder[] }>(`/projects/${id}/change-orders`); setOrders(res.data); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!coNumber || !description || !amount) { setError('All fields required'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/projects/${id}/change-orders`, { co_number: coNumber, description, amount: parseFloat(amount) });
      setShowForm(false); setCoNumber(''); setDescription(''); setAmount('');
      await load();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const totalApproved = orders.filter((o) => o.status === 'approved').reduce((sum, o) => sum + Number(o.amount), 0);

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${id}`}><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-[#5C4033]">Change Orders</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />New Change Order</Button>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      {showForm && (
        <Card className="mb-4 border-[#D4A854]/30 bg-[#D4A854]/5">
          <CardContent className="flex items-end gap-3 pt-4">
            <div><label className="text-xs font-medium text-[#5C4033]">CO #</label><Input value={coNumber} onChange={(e) => setCoNumber(e.target.value)} className="w-28" /></div>
            <div className="flex-1"><label className="text-xs font-medium text-[#5C4033]">Description</label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><label className="text-xs font-medium text-[#5C4033]">Amount</label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" className="w-36" /></div>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Submit'}</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </CardContent>
        </Card>
      )}
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>CO #</TH><TH>Description</TH><TH className="text-right">Amount</TH><TH>Status</TH><TH>Submitted</TH><TH>Approved</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={6} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && orders.map((o) => (
                <TR key={o.id}>
                  <TD className="font-mono font-medium">{o.co_number}</TD>
                  <TD>{o.description}</TD>
                  <TD className="text-right font-mono">{formatCurrency(o.amount)}</TD>
                  <TD><Badge variant={o.status === 'approved' ? 'success' : o.status === 'rejected' ? 'destructive' : 'warning'}>{o.status}</Badge></TD>
                  <TD>{formatDate(o.submitted_date)}</TD>
                  <TD>{formatDate(o.approved_date)}</TD>
                </TR>
              ))}
              {!loading && !orders.length && <TR><TD colSpan={6} className="text-center text-[#8B7355]">No change orders</TD></TR>}
            </TBody>
          </Table>
          <div className="mt-4 border-t border-[#E8DCC8] pt-3 flex justify-between text-sm font-medium text-[#5C4033]">
            <span>Total Approved</span><span className="font-mono">{formatCurrency(totalApproved)}</span>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
