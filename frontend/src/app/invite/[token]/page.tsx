'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface InviteInfo {
  email: string; role: string; user_type: string; external_type: string | null;
  company_name: string; inviter_name: string; message: string | null;
}

const PW_RULES = [
  { label: 'Min 10 characters', test: (p: string) => p.length >= 10 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /\d/.test(p) },
  { label: 'Special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function InviteAcceptPage() {
  const params = useParams();
  const token = params.token as string;
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name: '', password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/v1/invitations/${token}/info`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setLoadError(data.message || 'Invalid invitation'); return; }
        setInfo(data);
      })
      .catch(() => setLoadError('Failed to load invitation'));
  }, [token]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleAccept = async () => {
    setError('');
    if (!form.first_name || !form.last_name || !form.password) { setError('All fields are required'); return; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
    if (!PW_RULES.every((r) => r.test(form.password))) { setError('Password does not meet all requirements'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/invitations/${token}/accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: form.first_name, last_name: form.last_name, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to accept invitation'); return; }
      setSuccess(true);
    } catch { setError('Connection failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const typeLabel = info?.external_type
    ? info.external_type.charAt(0).toUpperCase() + info.external_type.slice(1)
    : 'Team Member';

  // Error state
  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#F5F0E8' }}>
        <Card className="w-full max-w-md border-[#E8DCC8]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: '#E07A5F20' }}>
              <X className="h-6 w-6" style={{ color: '#E07A5F' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#E07A5F' }}>Invalid Invitation</h2>
            <p className="mt-2 text-sm" style={{ color: '#5C4033' }}>{loadError}</p>
            <Link href="/login"><Button className="mt-6" variant="outline">Go to Login</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#F5F0E8' }}>
        <Card className="w-full max-w-md border-[#E8DCC8]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: '#2D6A4F20' }}>
              <Check className="h-6 w-6" style={{ color: '#2D6A4F' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#2D6A4F' }}>Account Created</h2>
            <p className="mt-2 text-sm" style={{ color: '#2C1810' }}>Your account has been set up successfully. You can now sign in.</p>
            <Link href="/login"><Button className="mt-6">Sign In</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
        <p style={{ color: '#5C4033' }}>Loading invitation...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#F5F0E8' }}>
      <Card className="w-full max-w-lg border-[#E8DCC8]">
        <CardHeader className="space-y-3 text-center">
          {/* Logo */}
          <div className="mx-auto mb-2 text-xl font-bold tracking-tight" style={{ color: '#2C1810' }}>
            MA Finance Hub
          </div>
          <p className="text-base" style={{ color: '#2C1810' }}>
            You&apos;ve been invited to <strong>{info.company_name}</strong>
          </p>
          <p className="text-sm" style={{ color: '#5C4033' }}>
            as {typeLabel} (<Badge variant="outline">{info.role}</Badge>) by {info.inviter_name}
          </p>
          {info.message && (
            <blockquote className="mx-4 mt-3 rounded-md border-l-4 px-4 py-3 text-left text-sm italic"
              style={{ borderColor: '#D4A854', backgroundColor: '#F5F0E8', color: '#5C4033' }}>
              {info.message}
            </blockquote>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>First Name</label>
              <Input placeholder="John" value={form.first_name} onChange={update('first_name')} />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Last Name</label>
              <Input placeholder="Doe" value={form.last_name} onChange={update('last_name')} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Email</label>
            <Input value={info.email} readOnly className="bg-[#F5F0E8]" style={{ color: '#5C4033' }} />
          </div>

          <div>
            <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Password</label>
            <Input type="password" value={form.password} onChange={update('password')} placeholder="Create a strong password" />
            {/* Password strength indicators */}
            <div className="mt-2 grid grid-cols-2 gap-1">
              {PW_RULES.map((r) => {
                const pass = r.test(form.password);
                return (
                  <div key={r.label} className="flex items-center gap-1.5 text-xs"
                    style={{ color: form.password ? (pass ? '#2D6A4F' : '#E07A5F') : '#5C4033' }}>
                    {form.password ? (pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />) : <span className="h-3 w-3 inline-block rounded-full border" style={{ borderColor: '#C4B5A0' }} />}
                    {r.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Confirm Password</label>
            <Input type="password" value={form.confirm_password} onChange={update('confirm_password')}
              placeholder="Re-enter password" onKeyDown={(e) => e.key === 'Enter' && handleAccept()} />
          </div>

          {error && <div className="rounded-md p-3 text-sm" style={{ backgroundColor: '#E07A5F20', color: '#E07A5F' }}>{error}</div>}

          <Button className="w-full" onClick={handleAccept} disabled={loading}>
            {loading ? 'Creating account...' : 'Accept Invitation & Create Account'}
          </Button>

          <p className="text-center text-sm" style={{ color: '#5C4033' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium underline" style={{ color: '#8B5E3C' }}>Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
