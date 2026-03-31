'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api';
import { Download, Plus, Lock } from 'lucide-react';

interface UserRow { user_id: string; external_subject: string; display_name: string; email: string | null; role: string; membership_is_active: boolean }

export default function AdminPage() {
  const { data: users, loading, refetch } = useApi<UserRow[]>('/admin/users');
  const { data: lockDate, refetch: refetchLock } = useApi<{ lock_date: string | null }>('/admin/lock-date');
  const [showUser, setShowUser] = useState(false);
  const [userForm, setUserForm] = useState({ external_subject: '', display_name: '', email: '' });
  const [showMembership, setShowMembership] = useState(false);
  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'viewer' });
  const [lockForm, setLockForm] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const createUser = async () => {
    setSaving(true); setErr('');
    try { await api.post('/admin/users', { ...userForm, email: userForm.email || undefined }); setShowUser(false); refetch(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); } finally { setSaving(false); }
  };

  const createMembership = async () => {
    setSaving(true); setErr('');
    try { await api.post('/admin/memberships', { user_id: Number(memberForm.user_id), role: memberForm.role }); setShowMembership(false); refetch(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); } finally { setSaving(false); }
  };

  const setLock = async () => {
    setSaving(true); setErr('');
    try { await api.patch('/admin/lock-date', { lock_date: lockForm || null }); refetchLock(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold">Admin</h1>
      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tenant Users</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowMembership(!showMembership)}><Plus className="mr-1 h-3 w-3" />Membership</Button>
              <Button size="sm" onClick={() => setShowUser(!showUser)}><Plus className="mr-1 h-3 w-3" />User</Button>
            </div>
          </CardHeader>
          <CardContent>
            {showUser && (
              <div className="mb-4 space-y-2 rounded border p-3">
                <Input placeholder="External Subject" value={userForm.external_subject} onChange={(e) => setUserForm({ ...userForm, external_subject: e.target.value })} />
                <Input placeholder="Display Name" value={userForm.display_name} onChange={(e) => setUserForm({ ...userForm, display_name: e.target.value })} />
                <Input placeholder="Email (optional)" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                <Button size="sm" onClick={createUser} disabled={saving}>Create User</Button>
              </div>
            )}
            {showMembership && (
              <div className="mb-4 space-y-2 rounded border p-3">
                <Input placeholder="User ID" value={memberForm.user_id} onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })} />
                <select className="h-10 w-full rounded-md border px-3 text-sm" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                  {['owner', 'admin', 'manager', 'analyst', 'viewer'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Button size="sm" onClick={createMembership} disabled={saving}>Add Membership</Button>
              </div>
            )}
            {loading ? <p>Loading...</p> : (
              <Table>
                <THead><TR><TH>ID</TH><TH>Subject</TH><TH>Name</TH><TH>Role</TH><TH>Status</TH><TH></TH></TR></THead>
                <TBody>
                  {users?.map((u) => (
                    <TR key={u.user_id}><TD>{u.user_id}</TD><TD className="font-mono text-sm">{u.external_subject}</TD><TD>{u.display_name}</TD>
                      <TD><Badge variant="outline">{u.role}</Badge></TD>
                      <TD><Badge variant={u.membership_is_active ? 'success' : 'destructive'}>{u.membership_is_active ? 'Active' : 'Inactive'}</Badge></TD>
                      <TD><Button size="sm" variant="outline" onClick={async () => {
                        const pw = prompt(`Set password for ${u.display_name}:`);
                        if (!pw || pw.length < 8) { setErr('Password must be at least 8 characters'); return; }
                        try { await api.post(`/admin/users/${u.user_id}/set-password`, { password: pw }); setErr(''); alert('Password set'); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
                      }}>Set Password</Button></TD></TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" />Lock Date</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Current: <span className="font-bold">{lockDate?.lock_date || 'Not set'}</span></p>
              <Input type="date" value={lockForm} onChange={(e) => setLockForm(e.target.value)} />
              <Button size="sm" onClick={setLock} disabled={saving}>Set Lock Date</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Exports</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" variant="outline" className="w-full" onClick={() => window.open('/api/v1/admin/export/audit-log', '_blank')}>
                <Download className="mr-2 h-4 w-4" />Audit Log</Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => window.open('/api/v1/admin/export/trial-balance', '_blank')}>
                <Download className="mr-2 h-4 w-4" />Trial Balance</Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => window.open('/api/v1/journal-entries/export', '_blank')}>
                <Download className="mr-2 h-4 w-4" />Journal Entries</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
