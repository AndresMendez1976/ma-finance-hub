'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function RegisterPage() {
  const [form, setForm] = useState({
    company_name: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async () => {
    setError('');
    if (!form.company_name || !form.first_name || !form.last_name || !form.email || !form.password) {
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
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name,
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Registration failed');
        return;
      }
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#F5F0E8' }}>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <p className="text-sm" style={{ color: '#8B7355' }}>Start your free 14-day trial of MA Finance Hub</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#5C4033]">Company Name</label>
            <Input placeholder="Acme Corporation" value={form.company_name} onChange={update('company_name')} />
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
            <label className="text-sm font-medium text-[#5C4033]">Email</label>
            <Input type="email" placeholder="you@company.com" value={form.email} onChange={update('email')} />
          </div>

          <div>
            <label className="text-sm font-medium text-[#5C4033]">Password</label>
            <Input type="password" placeholder="Min 10 chars, upper, lower, number, special" value={form.password} onChange={update('password')} />
          </div>

          <div>
            <label className="text-sm font-medium text-[#5C4033]">Confirm Password</label>
            <Input type="password" placeholder="Re-enter password" value={form.confirm_password} onChange={update('confirm_password')}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()} />
          </div>

          <label className="flex items-start gap-2 text-sm text-[#5C4033]">
            <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#C4B5A0]" />
            <span>
              I agree to the{' '}
              <Link href="/legal/terms" className="underline" style={{ color: '#8B5E3C' }}>Terms of Service</Link>{' '}
              and{' '}
              <Link href="/legal/privacy" className="underline" style={{ color: '#8B5E3C' }}>Privacy Policy</Link>
            </span>
          </label>

          {error && <div className="rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

          <Button className="w-full" onClick={handleRegister} disabled={loading}>
            {loading ? 'Creating account...' : 'Start Free 14-Day Trial'}
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
