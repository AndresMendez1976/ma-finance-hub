'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api';
import { Copy, Send, Link2 } from 'lucide-react';

const ROLES = ['admin', 'manager', 'analyst', 'viewer'];
const EXTERNAL_TYPES = ['accountant', 'auditor', 'consultant', 'vendor', 'client'];
const EXPIRY_OPTIONS = [
  { label: '3 days', value: 3 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];
const PERMISSION_OPTIONS = [
  { key: 'view_reports', label: 'View Reports' },
  { key: 'view_invoices', label: 'View Invoices' },
  { key: 'view_expenses', label: 'View Expenses' },
  { key: 'manage_contacts', label: 'Manage Contacts' },
  { key: 'manage_invoices', label: 'Manage Invoices' },
  { key: 'manage_expenses', label: 'Manage Expenses' },
  { key: 'export_data', label: 'Export Data' },
];

interface InvitationResult {
  id: number;
  token: string;
  email: string;
  role: string;
  expires_at: string;
}

export default function InviteUserPage() {
  const [form, setForm] = useState({
    email: '',
    role: 'viewer',
    user_type: 'internal' as 'internal' | 'external',
    external_type: '',
    message: '',
    expires_in_days: 7,
    permissions: {} as Record<string, boolean>,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const togglePermission = (key: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const inviteLink = result
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${result.token}`
    : '';

  const handleSubmit = async () => {
    setError('');
    if (!form.email) { setError('Email is required'); return; }
    if (form.user_type === 'external' && !form.external_type) { setError('External type is required for external users'); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email: form.email,
        role: form.role,
        user_type: form.user_type,
        expires_in_days: form.expires_in_days,
      };
      if (form.user_type === 'external') payload.external_type = form.external_type;
      if (form.message) payload.message = form.message;
      const activePermissions = Object.entries(form.permissions).filter(([, v]) => v);
      if (activePermissions.length > 0) {
        payload.permissions = Object.fromEntries(activePermissions);
      }

      const data = await api.post<InvitationResult>('/invitations', payload);
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create invitation');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold" style={{ color: '#5C4033' }}>Invite User</h1>

      {result ? (
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-lg" style={{ color: '#6B8F71' }}>Invitation Created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm" style={{ color: '#5C4033' }}>
              An invitation has been created for <strong>{result.email}</strong> with the role <Badge variant="outline">{result.role}</Badge>.
            </p>
            <p className="text-sm" style={{ color: '#8B7355' }}>
              Expires: {new Date(result.expires_at).toLocaleDateString()}
            </p>

            <div>
              <label className="text-sm font-medium text-[#5C4033]">Invitation Link</label>
              <div className="mt-1 flex gap-2">
                <Input value={inviteLink} readOnly className="bg-gray-50 text-xs" />
                <Button size="sm" variant="outline" onClick={copyLink}>
                  <Copy className="mr-1 h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <p className="text-xs" style={{ color: '#8B7355' }}>Share this link with the invited user. They will use it to create their account.</p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setForm({ email: '', role: 'viewer', user_type: 'internal', external_type: '', message: '', expires_in_days: 7, permissions: {} }); }}>
                Invite Another
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5" style={{ color: '#8B5E3C' }} />
              New Invitation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Email Address</label>
              <Input type="email" placeholder="user@example.com" value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>

            <div>
              <label className="text-sm font-medium text-[#5C4033]">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#5C4033] focus:border-[#8B5E3C] focus:outline-none focus:ring-1 focus:ring-[#8B5E3C]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#5C4033]">User Type</label>
              <div className="mt-1 flex gap-2">
                <Button size="sm" variant={form.user_type === 'internal' ? 'default' : 'outline'}
                  onClick={() => setForm((prev) => ({ ...prev, user_type: 'internal', external_type: '' }))}>
                  Internal
                </Button>
                <Button size="sm" variant={form.user_type === 'external' ? 'default' : 'outline'}
                  onClick={() => setForm((prev) => ({ ...prev, user_type: 'external' }))}>
                  External
                </Button>
              </div>
            </div>

            {form.user_type === 'external' && (
              <div>
                <label className="text-sm font-medium text-[#5C4033]">External Type</label>
                <select
                  value={form.external_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, external_type: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#5C4033] focus:border-[#8B5E3C] focus:outline-none focus:ring-1 focus:ring-[#8B5E3C]"
                >
                  <option value="">Select type...</option>
                  {EXTERNAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}

            {form.user_type === 'external' && (
              <div>
                <label className="text-sm font-medium text-[#5C4033]">Permissions</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PERMISSION_OPTIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm text-[#5C4033]">
                      <input
                        type="checkbox"
                        checked={!!form.permissions[p.key]}
                        onChange={() => togglePermission(p.key)}
                        className="h-4 w-4 rounded border-[#C4B5A0]"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-[#5C4033]">Personal Message (optional)</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Add a welcome message..."
                rows={3}
                className="mt-1 block w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#5C4033] focus:border-[#8B5E3C] focus:outline-none focus:ring-1 focus:ring-[#8B5E3C]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#5C4033]">Expires In</label>
              <select
                value={form.expires_in_days}
                onChange={(e) => setForm((prev) => ({ ...prev, expires_in_days: Number(e.target.value) }))}
                className="mt-1 block w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#5C4033] focus:border-[#8B5E3C] focus:outline-none focus:ring-1 focus:ring-[#8B5E3C]"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {error && <div className="rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

            <Button className="w-full" onClick={handleSubmit} disabled={saving}>
              <Link2 className="mr-2 h-4 w-4" />
              {saving ? 'Creating...' : 'Generate Invitation Link'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
