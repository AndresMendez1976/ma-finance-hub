// Multi-Company Settings — manage company groups, add/remove tenants
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, extractArray } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { Plus, Trash2, Building2 } from 'lucide-react';

interface CompanyGroup { id: number; name: string; created_at: string; tenants: GroupTenant[] }
interface GroupTenant { id: number; tenant_id: number; tenant_name: string; role: string; added_at: string }

export default function CompaniesSettingsPage() {
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addTenantGroupId, setAddTenantGroupId] = useState<number | null>(null);
  const [newTenantId, setNewTenantId] = useState('');
  const [newTenantRole, setNewTenantRole] = useState('subsidiary');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get<unknown>('/settings/company-groups'); setGroups(extractArray<CompanyGroup>(res)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createGroup = async () => {
    if (!newGroupName) { setError('Group name is required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/settings/company-groups', { name: newGroupName });
      setShowNewGroup(false); setNewGroupName(''); await load();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const addTenant = async (groupId: number) => {
    if (!newTenantId) { setError('Tenant ID is required'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/settings/company-groups/${groupId}/tenants`, { tenant_id: parseInt(newTenantId), role: newTenantRole });
      setAddTenantGroupId(null); setNewTenantId(''); await load();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const removeTenant = async (groupId: number, tenantId: number) => {
    setSaving(true); setError('');
    try { await api.post(`/settings/company-groups/${groupId}/tenants/${tenantId}/remove`); await load(); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-[#5C4033]" />
          <h1 className="text-2xl font-bold text-[#5C4033]">Multi-Company Management</h1>
        </div>
        <Button onClick={() => setShowNewGroup(!showNewGroup)}><Plus className="mr-2 h-4 w-4" />New Group</Button>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      {showNewGroup && (
        <Card className="mb-4 border-[#D4A854]/30 bg-[#D4A854]/5">
          <CardContent className="flex items-end gap-3 pt-4">
            <div className="flex-1"><label className="text-xs font-medium text-[#5C4033]">Group Name</label><Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Acme Holdings" /></div>
            <Button onClick={createGroup} disabled={saving}>{saving ? 'Creating...' : 'Create Group'}</Button>
            <Button variant="ghost" onClick={() => setShowNewGroup(false)}>Cancel</Button>
          </CardContent>
        </Card>
      )}
      {loading && <p className="text-[#8B7355]">Loading...</p>}
      {!loading && groups.map((group) => (
        <Card key={group.id} className="mb-4 border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#5C4033]">{group.name}</CardTitle>
              <span className="text-xs text-[#8B7355]">Created {formatDate(group.created_at)}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead><TR><TH>Tenant</TH><TH>Role</TH><TH>Added</TH><TH>Actions</TH></TR></THead>
              <TBody>
                {group.tenants.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium">{t.tenant_name} <span className="text-xs text-[#8B7355]">(ID: {t.tenant_id})</span></TD>
                    <TD><Badge variant={t.role === 'parent' ? 'success' : 'info'}>{t.role}</Badge></TD>
                    <TD className="text-sm text-[#8B7355]">{formatDate(t.added_at)}</TD>
                    <TD><Button size="sm" variant="ghost" className="text-[#E07A5F]" onClick={() => removeTenant(group.id, t.tenant_id)}><Trash2 className="h-4 w-4" /></Button></TD>
                  </TR>
                ))}
                {!group.tenants.length && <TR><TD colSpan={4} className="text-center text-[#8B7355]">No tenants in this group</TD></TR>}
              </TBody>
            </Table>
            {addTenantGroupId === group.id ? (
              <div className="mt-3 flex items-end gap-3">
                <div><label className="text-xs text-[#8B7355]">Tenant ID</label><Input type="number" value={newTenantId} onChange={(e) => setNewTenantId(e.target.value)} className="w-28" /></div>
                <div><label className="text-xs text-[#8B7355]">Role</label>
                  <select value={newTenantRole} onChange={(e) => setNewTenantRole(e.target.value)} className="flex h-10 rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm">
                    <option value="parent">Parent</option><option value="subsidiary">Subsidiary</option><option value="affiliate">Affiliate</option>
                  </select>
                </div>
                <Button size="sm" onClick={() => addTenant(group.id)} disabled={saving}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddTenantGroupId(null)}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setAddTenantGroupId(group.id)}><Plus className="mr-1 h-3 w-3" />Add Tenant</Button>
            )}
            <p className="mt-2 text-xs text-[#8B7355]">Group value tracked via consolidated reporting | {formatCurrency(0)} base</p>
          </CardContent>
        </Card>
      ))}
      {!loading && !groups.length && (
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-6 text-center text-[#8B7355]">
            <p>No company groups configured. Create a group to manage multi-company relationships.</p>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
