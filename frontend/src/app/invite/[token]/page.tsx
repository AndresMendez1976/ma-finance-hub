'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InviteInfo {
  email: string;
  role: string;
  user_type: string;
  external_type: string | null;
  company_name: string;
  inviter_name: string;
  message: string | null;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
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
    if (!form.first_name || !form.last_name || !form.password) {
      setError('All fields are required');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to accept invitation');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#F5F0E8' }}>
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold" style={{ color: '#E07A5F' }}>Invalid Invitation</h2>
            <p className="mt-2 text-sm" style={{ color: '#8B7355' }}>{loadError}</p>
            <Link href="/login" className="mt-4 inline-block text-sm underline" style={{ color: '#8B5E3C' }}>Go to Login</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#F5F0E8' }}>
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold" style={{ color: '#6B8F71' }}>Account Created</h2>
            <p className="mt-2 text-sm" style={{ color: '#5C4033' }}>Your account has been set up successfully. You can now sign in.</p>
            <Link href="/login">
              <Button className="mt-4">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
        <p style={{ color: '#8B7355' }}>Loading invitation...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#F5F0E8' }}>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Join {info.company_name}</CardTitle>
          <p className="mt-1 text-sm" style={{ color: '#8B7355' }}>
            {info.inviter_name} invited you to join as <Badge variant="outline">{info.role}</Badge>
          </p>
          {info.user_type === 'external' && info.external_type && (
            <p className="mt-1 text-xs" style={{ color: '#8B7355' }}>
              External access: {info.external_type}
            </p>
          )}
          {info.message && (
            <div className="mt-3 rounded-md p-3 text-left text-sm" style={{ backgroundColor: '#F5F0E8', color: '#5C4033' }}>
              "{info.message}"
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#5C4033]">Email</label>
            <Input value={info.email} disabled className="bg-gray-50" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[#5C4033]">First Name</label>
              <Input placeholder="John" value={form.first_name} onChange={update('first_name')} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#5C4033]">Last Name</label>
              <Input placeholder="Doe" value={form.last_name} onChange={update('last_name')} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#5C4033]">Password</label>
            <Input type="password" placeholder="Min 10 chars, upper, lower, number, special" value={form.password} onChange={update('password')} />
          </div>

          <div>
            <label className="text-sm font-medium text-[#5C4033]">Confirm Password</label>
            <Input type="password" placeholder="Re-enter password" value={form.confirm_password} onChange={update('confirm_password')}
              onKeyDown={(e) => e.key === 'Enter' && handleAccept()} />
          </div>

          {error && <div className="rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

          <Button className="w-full" onClick={handleAccept} disabled={loading}>
            {loading ? 'Creating account...' : 'Accept Invitation'}
          </Button>

          <p className="text-center text-sm" style={{ color: '#8B7355' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium underline" style={{ color: '#8B5E3C' }}>Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
