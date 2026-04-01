'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { formatDate, formatCurrency } from '@/lib/format';

interface Opportunity {
  id: number; title: string; contact_name: string; value: number; currency: string;
  expected_close_date: string; stage_name: string; pipeline_name: string;
  source: string; notes: string; status: string; assigned_to: string;
}
interface Activity { id: number; type: string; title: string; description: string; date: string }
interface Stage { id: number; name: string }

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [msg, setMsg] = useState('');
  const [actForm, setActForm] = useState({ type: 'note', title: '', description: '', date: '' });
  const [moveStage, setMoveStage] = useState('');

  useEffect(() => {
    api.get<Opportunity>(`/crm/opportunities/${id}`).then(setOpp).catch(() => {});
    api.get<{ data: Activity[] }>(`/crm/opportunities/${id}/activities`).then((r) => setActivities(r.data)).catch(() => {});
    api.get<{ data: Stage[] }>('/crm/stages').then((r) => setStages(r.data)).catch(() => {});
  }, [id]);

  const doAction = async (action: string, body?: object) => {
    try {
      await api.post(`/crm/opportunities/${id}/${action}`, body);
      setMsg(`${action} successful`);
      const fresh = await api.get<Opportunity>(`/crm/opportunities/${id}`);
      setOpp(fresh);
    } catch (e: unknown) { setMsg((e as Error).message); }
  };

  const addActivity = async () => {
    try {
      await api.post(`/crm/opportunities/${id}/activities`, actForm);
      const r = await api.get<{ data: Activity[] }>(`/crm/opportunities/${id}/activities`);
      setActivities(r.data);
      setActForm({ type: 'note', title: '', description: '', date: '' });
    } catch (e: unknown) { setMsg((e as Error).message); }
  };

  if (!opp) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">{opp.title}</h1>
      {msg && <div className="mb-3 rounded-md bg-[#2D6A4F]/10 p-2 text-sm text-[#2D6A4F]">{msg}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Opportunity Info</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-[#8B7355]">Contact</dt><dd>{opp.contact_name}</dd>
              <dt className="text-[#8B7355]">Pipeline</dt><dd>{opp.pipeline_name}</dd>
              <dt className="text-[#8B7355]">Stage</dt><dd>{opp.stage_name}</dd>
              <dt className="text-[#8B7355]">Value</dt><dd className="font-mono">{formatCurrency(opp.value, opp.currency)}</dd>
              <dt className="text-[#8B7355]">Expected Close</dt><dd>{formatDate(opp.expected_close_date)}</dd>
              <dt className="text-[#8B7355]">Source</dt><dd>{opp.source}</dd>
              <dt className="text-[#8B7355]">Status</dt><dd>{opp.status}</dd>
              <dt className="text-[#8B7355]">Assigned To</dt><dd>{opp.assigned_to}</dd>
            </dl>
            {opp.notes && <p className="mt-3 text-sm text-[#8B7355]">{opp.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <select value={moveStage} onChange={(e) => setMoveStage(e.target.value)} className="h-10 flex-1 rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                <option value="">Move to stage...</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Button size="sm" disabled={!moveStage} onClick={() => doAction('move', { stage_id: Number(moveStage) })}>Move</Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => doAction('win')} className="bg-[#2D6A4F]">Win</Button>
              <Button variant="destructive" onClick={() => doAction('lose')}>Lose</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Date</TH><TH>Type</TH><TH>Title</TH><TH>Description</TH></TR></THead>
            <TBody>
              {activities.map((a) => (
                <TR key={a.id}><TD>{formatDate(a.date)}</TD><TD className="capitalize">{a.type}</TD><TD>{a.title}</TD><TD className="text-sm text-[#8B7355]">{a.description}</TD></TR>
              ))}
              {!activities.length && <TR><TD colSpan={4} className="text-center text-[#8B7355]">No activities</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <select value={actForm.type} onChange={(e) => setActForm((p) => ({ ...p, type: e.target.value }))} className="h-10 rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
              <option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option>
            </select>
            <Input value={actForm.title} onChange={(e) => setActForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" />
            <Input value={actForm.description} onChange={(e) => setActForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
            <Input type="date" value={actForm.date} onChange={(e) => setActForm((p) => ({ ...p, date: e.target.value }))} />
          </div>
          <Button className="mt-3" size="sm" onClick={addActivity}>Add Activity</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
