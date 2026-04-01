'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { Download } from 'lucide-react';

interface AuditEntry {
  id: number; timestamp: string; user_email: string; action: string;
  entity: string; entity_id: string; ip_address: string;
}

const ACTIONS = ['', 'create', 'update', 'delete', 'login', 'logout', 'approve', 'reject'];
const ENTITIES = ['', 'invoice', 'expense', 'journal', 'contact', 'product', 'user', 'budget', 'work_order'];

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (userFilter) params.set('user', userFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (entityFilter) params.set('entity', entityFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    try { setEntries(extractArray(await api.get<unknown>(`/admin/audit-log?${params}`))); }
    catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (userFilter) params.set('user', userFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (entityFilter) params.set('entity', entityFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    window.open(`/api/v1/admin/audit-log/export?${params}`, '_blank');
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Audit Log</h1>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>
      <Card className="mb-4 border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#2C1810]">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">User</label>
              <Input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Email" className="w-44" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Action</label>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="h-10 w-36 rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#2C1810]">
                {ACTIONS.map((a) => <option key={a} value={a}>{a || 'All'}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">Entity</label>
              <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="h-10 w-40 rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#2C1810]">
                {ENTITIES.map((en) => <option key={en} value={en}>{en || 'All'}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5C4033]">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Apply'}</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Timestamp</TH><TH>User</TH><TH>Action</TH><TH>Entity</TH><TH>Entity ID</TH><TH>IP Address</TH></TR>
            </THead>
            <TBody>
              {entries.map((e) => (
                <TR key={e.id}>
                  <TD className="text-sm text-[#5C4033] whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</TD>
                  <TD className="text-sm">{e.user_email}</TD>
                  <TD><span className="rounded bg-[#E8DCC8] px-2 py-0.5 text-xs font-medium text-[#2C1810]">{e.action}</span></TD>
                  <TD className="text-sm text-[#5C4033]">{e.entity}</TD>
                  <TD className="font-mono text-sm">{e.entity_id}</TD>
                  <TD className="font-mono text-sm text-[#5C4033]">{e.ip_address}</TD>
                </TR>
              ))}
              {entries.length === 0 && <TR><TD colSpan={6} className="text-center text-[#5C4033]">No audit entries found</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
