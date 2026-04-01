'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, extractArray } from '@/lib/api';
import { Shield, Copy, Plus, Users, UserCheck, Clock } from 'lucide-react';
import Link from 'next/link';

type Tab = 'internal' | 'external' | 'pending';

interface InternalUser {
  id: number; first_name: string; last_name: string; email: string;
  role: string; mfa_enabled: boolean; last_login_at: string | null;
  is_active: boolean;
}
interface ExternalUser {
  id: number; first_name: string; last_name: string; email: string;
  external_type: string; role: string; access_expires_at: string | null;
  last_activity_at: string | null; is_active: boolean;
}
interface Invitation {
  id: number; email: string; user_type: string; role: string;
  invited_by_name: string; created_at: string; expires_at: string;
  status: string; token: string;
}

const TYPE_BADGES: Record<string, string> = {
  accountant: '\u{1F9EE}', attorney: '\u2696\uFE0F', auditor: '\u{1F50D}', consultant: '\u{1F464}',
};

const selectCls = 'text-sm font-medium px-4 py-2 rounded-lg transition-colors';

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('internal');
  const [internals, setInternals] = useState<InternalUser[]>([]);
  const [externals, setExternals] = useState<ExternalUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    api.get<InternalUser[]>('/admin/users').then((r: unknown) => setInternals(extractArray(r))).catch(() => {});
    api.get<ExternalUser[]>('/users/external').then((r: unknown) => setExternals(extractArray(r))).catch(() => {});
    api.get<Invitation[]>('/invitations').then((r: unknown) => setInvitations(extractArray(r))).catch(() => {});
  }, []);

  const copyLink = (inv: Invitation) => {
    const link = `${window.location.origin}/invite/${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopied(inv.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const thCls = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider';
  const tdCls = 'px-4 py-3 text-sm';

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: '#2C1810' }}>User Management</h1>
        <Link href="/admin/users/invite">
          <Button size="sm"><Plus className="mr-1 h-4 w-4" />
            {tab === 'external' ? 'Invite External Professional' : 'Invite Internal User'}
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg p-1" style={{ backgroundColor: '#E8DCC8' }}>
        {([
          { key: 'internal' as Tab, label: 'Internal Users', icon: Users },
          { key: 'external' as Tab, label: 'External Users', icon: UserCheck },
          { key: 'pending' as Tab, label: 'Pending Invitations', icon: Clock },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`${selectCls} flex items-center gap-2 ${tab === key ? 'bg-white shadow-sm' : ''}`}
            style={{ color: tab === key ? '#2C1810' : '#5C4033' }}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <Card className="border" style={{ borderColor: '#E8DCC8' }}>
        <CardContent className="p-0">
          {tab === 'internal' && (
            <table className="w-full">
              <thead style={{ backgroundColor: '#F5F0E8' }}>
                <tr style={{ color: '#5C4033' }}>
                  <th className={thCls}>Name</th><th className={thCls}>Email</th>
                  <th className={thCls}>Role</th><th className={thCls}>MFA</th>
                  <th className={thCls}>Last Login</th><th className={thCls}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#E8DCC8' }}>
                {internals.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F5F0E8]/50">
                    <td className={tdCls} style={{ color: '#2C1810' }}>{u.first_name} {u.last_name}</td>
                    <td className={tdCls} style={{ color: '#5C4033' }}>{u.email}</td>
                    <td className={tdCls}><Badge variant="outline">{u.role}</Badge></td>
                    <td className={tdCls}>
                      <Shield className="h-4 w-4" style={{ color: u.mfa_enabled ? '#2D6A4F' : '#C4B5A0' }} />
                    </td>
                    <td className={tdCls} style={{ color: '#5C4033' }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: u.is_active ? '#2D6A4F20' : '#E07A5F20', color: u.is_active ? '#2D6A4F' : '#E07A5F' }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {internals.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: '#5C4033' }}>No internal users found</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'external' && (
            <table className="w-full">
              <thead style={{ backgroundColor: '#F5F0E8' }}>
                <tr style={{ color: '#5C4033' }}>
                  <th className={thCls}>Name</th><th className={thCls}>Email</th>
                  <th className={thCls}>Type</th><th className={thCls}>Role</th>
                  <th className={thCls}>Access Expires</th><th className={thCls}>Last Activity</th>
                  <th className={thCls}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#E8DCC8' }}>
                {externals.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F5F0E8]/50">
                    <td className={tdCls} style={{ color: '#2C1810' }}>{u.first_name} {u.last_name}</td>
                    <td className={tdCls} style={{ color: '#5C4033' }}>{u.email}</td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center gap-1 text-sm">
                        {TYPE_BADGES[u.external_type] || '\u{1F464}'} {u.external_type}
                      </span>
                    </td>
                    <td className={tdCls}><Badge variant="outline">{u.role}</Badge></td>
                    <td className={tdCls} style={{ color: '#5C4033' }}>
                      {u.access_expires_at ? new Date(u.access_expires_at).toLocaleDateString() : 'Indefinite'}
                    </td>
                    <td className={tdCls} style={{ color: '#5C4033' }}>
                      {u.last_activity_at ? new Date(u.last_activity_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: u.is_active ? '#2D6A4F20' : '#E07A5F20', color: u.is_active ? '#2D6A4F' : '#E07A5F' }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {externals.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: '#5C4033' }}>No external users found</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'pending' && (
            <table className="w-full">
              <thead style={{ backgroundColor: '#F5F0E8' }}>
                <tr style={{ color: '#5C4033' }}>
                  <th className={thCls}>Email</th><th className={thCls}>Type</th>
                  <th className={thCls}>Role</th><th className={thCls}>Invited By</th>
                  <th className={thCls}>Sent</th><th className={thCls}>Expires</th>
                  <th className={thCls}>Status</th><th className={thCls}></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#E8DCC8' }}>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F5F0E8]/50">
                    <td className={tdCls} style={{ color: '#2C1810' }}>{inv.email}</td>
                    <td className={tdCls} style={{ color: '#5C4033' }}>{inv.user_type}</td>
                    <td className={tdCls}><Badge variant="outline">{inv.role}</Badge></td>
                    <td className={tdCls} style={{ color: '#5C4033' }}>{inv.invited_by_name}</td>
                    <td className={tdCls} style={{ color: '#5C4033' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className={tdCls} style={{ color: '#5C4033' }}>{new Date(inv.expires_at).toLocaleDateString()}</td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: inv.status === 'pending' ? '#D4A85420' : '#2D6A4F20', color: inv.status === 'pending' ? '#D4A854' : '#2D6A4F' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <Button size="sm" variant="ghost" onClick={() => copyLink(inv)}>
                        <Copy className="mr-1 h-3 w-3" />{copied === inv.id ? 'Copied!' : 'Copy Link'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {invitations.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: '#5C4033' }}>No pending invitations</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
