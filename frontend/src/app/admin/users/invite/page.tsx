'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api';
import { Copy, Link2, FileText, BarChart3, Receipt, DollarSign, Landmark, Users } from 'lucide-react';

const INTERNAL_ROLES = ['Admin', 'Manager', 'Analyst', 'Viewer'];
const EXTERNAL_TYPES = ['Accountant', 'Attorney', 'Auditor', 'Tax Specialist', 'Consultant', 'Other'];
const EXTERNAL_ROLES = ['Manager', 'Analyst', 'Viewer'];
const DURATION_OPTIONS = [
  { label: '30 days', value: 30 }, { label: '90 days', value: 90 },
  { label: '6 months', value: 180 }, { label: '1 year', value: 365 },
  { label: 'Indefinite', value: 0 },
];

const PERMISSION_GROUPS = [
  { icon: FileText, label: 'General Ledger', keys: ['view_gl', 'manage_gl'] },
  { icon: BarChart3, label: 'Reports', keys: ['view_reports', 'export_data'] },
  { icon: Receipt, label: 'Invoices', keys: ['view_invoices', 'manage_invoices'] },
  { icon: DollarSign, label: 'Expenses', keys: ['view_expenses', 'manage_expenses'] },
  { icon: Landmark, label: 'Banking', keys: ['view_banking', 'manage_banking'] },
  { icon: Users, label: 'Payroll', keys: ['view_payroll'] },
];

const TYPE_PRESETS: Record<string, string[]> = {
  Accountant: ['view_gl', 'view_reports', 'export_data', 'view_invoices', 'view_expenses', 'view_banking', 'view_payroll'],
  Attorney: ['view_reports', 'export_data'],
  Auditor: ['view_gl', 'view_reports', 'export_data', 'view_invoices', 'view_expenses', 'view_banking', 'view_payroll'],
  'Tax Specialist': ['view_gl', 'view_reports', 'export_data', 'view_expenses'],
  Consultant: ['view_reports'],
  Other: [],
};

interface InvitationResult { id: number; token: string; email: string; role: string; expires_at: string }

const inputCls = 'mt-1 block w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus:border-[#8B5E3C] focus:outline-none focus:ring-1 focus:ring-[#8B5E3C]';

export default function InviteUserPage() {
  const [mode, setMode] = useState<'internal' | 'external'>('internal');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Viewer');
  const [externalType, setExternalType] = useState('Accountant');
  const [duration, setDuration] = useState(90);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteLink = result ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${result.token}` : '';

  const applyPreset = (type: string) => {
    setExternalType(type);
    const preset = TYPE_PRESETS[type] || [];
    const perms: Record<string, boolean> = {};
    preset.forEach((k) => { perms[k] = true; });
    setPermissions(perms);
  };

  const togglePerm = (key: string) => setPermissions((p) => ({ ...p, [key]: !p[key] }));

  const handleSubmit = async () => {
    setError('');
    if (!email) { setError('Email is required'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email, role: role.toLowerCase(), user_type: mode,
        expires_in_days: duration || undefined,
      };
      if (mode === 'external') payload.external_type = externalType.toLowerCase();
      if (message) payload.message = message;
      const active = Object.entries(permissions).filter(([, v]) => v);
      if (active.length) payload.permissions = Object.fromEntries(active);
      const data = await api.post<InvitationResult>('/invitations', payload);
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create invitation');
    } finally { setSaving(false); }
  };

  const copyLink = () => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (result) {
    return (
      <Shell>
        <Card className="mx-auto max-w-lg border-[#E8DCC8]">
          <CardHeader className="text-center">
            <CardTitle style={{ color: '#2D6A4F' }}>Invitation Created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm" style={{ color: '#2C1810' }}>
              Invitation sent to <strong>{result.email}</strong> as <Badge variant="outline">{result.role}</Badge>
            </p>
            <p className="text-xs" style={{ color: '#5C4033' }}>Expires: {new Date(result.expires_at).toLocaleDateString()}</p>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Invitation Link</label>
              <div className="mt-1 flex gap-2">
                <Input value={inviteLink} readOnly className="bg-[#F5F0E8] text-xs" />
                <Button size="sm" variant="outline" onClick={copyLink}>
                  <Copy className="mr-1 h-4 w-4" />{copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setResult(null); setEmail(''); setMessage(''); }}>
              Invite Another
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold" style={{ color: '#2C1810' }}>Invite User</h1>
      <Card className="mx-auto max-w-lg border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#2C1810' }}>
            <Link2 className="h-5 w-5" style={{ color: '#8B5E3C' }} />New Invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle */}
          <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: '#E8DCC8' }}>
            {(['internal', 'external'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-white shadow-sm' : ''}`}
                style={{ color: mode === m ? '#2C1810' : '#5C4033' }}>
                {m === 'internal' ? 'Internal' : 'External'}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Email Address</label>
            <Input type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {mode === 'external' && (
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Professional Type</label>
              <select value={externalType} onChange={(e) => applyPreset(e.target.value)} className={inputCls}>
                {EXTERNAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {(mode === 'internal' ? INTERNAL_ROLES : EXTERNAL_ROLES).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {mode === 'external' && (
            <>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Access Duration</label>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls}>
                  {DURATION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Permissions</label>
                <div className="mt-2 space-y-3">
                  {PERMISSION_GROUPS.map(({ icon: Icon, label, keys }) => (
                    <div key={label} className="rounded-md border p-3" style={{ borderColor: '#E8DCC8' }}>
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: '#2C1810' }}>
                        <Icon className="h-4 w-4" style={{ color: '#8B5E3C' }} />{label}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {keys.map((k) => (
                          <label key={k} className="flex items-center gap-1.5 text-xs" style={{ color: '#5C4033' }}>
                            <input type="checkbox" checked={!!permissions[k]} onChange={() => togglePerm(k)}
                              className="h-3.5 w-3.5 rounded border-[#C4B5A0]" />
                            {k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Personal Message (optional)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
              placeholder="Add a welcome message..." className={inputCls} />
          </div>

          {error && <div className="rounded-md p-3 text-sm" style={{ backgroundColor: '#E07A5F20', color: '#E07A5F' }}>{error}</div>}

          <Button className="w-full" onClick={handleSubmit} disabled={saving}>
            <Link2 className="mr-2 h-4 w-4" />{saving ? 'Creating...' : 'Generate Invitation Link'}
          </Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
