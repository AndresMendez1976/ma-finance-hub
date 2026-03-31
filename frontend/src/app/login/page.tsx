'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function LoginForm() {
  const [mode, setMode] = useState<'credentials' | 'token'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get('expired');

  const loginWithCredentials = async () => {
    if (!email || !password || !tenantId) { setError('All fields required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenant_id: Number(tenantId) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Login failed'); return; }
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch { setError('Connection failed'); }
    finally { setLoading(false); }
  };

  const loginWithToken = async () => {
    if (!token.trim()) { setError('Token required'); return; }
    setLoading(true); setError('');
    localStorage.setItem('token', token.trim());
    try {
      const res = await fetch('/api/v1/auth/context', { headers: { Authorization: `Bearer ${token.trim()}` } });
      if (!res.ok) { setError('Invalid token'); localStorage.removeItem('token'); return; }
      router.push('/dashboard');
    } catch { setError('Connection failed'); localStorage.removeItem('token'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">MA Finance Hub</CardTitle>
          <p className="text-sm text-muted-foreground">Powered by MAiSHQ</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {expired && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">Session expired. Please sign in again.</div>}

          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'credentials' ? 'default' : 'outline'} onClick={() => setMode('credentials')}>Email & Password</Button>
            <Button size="sm" variant={mode === 'token' ? 'default' : 'outline'} onClick={() => setMode('token')}>Dev Token</Button>
          </div>

          {mode === 'credentials' ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="admin@demo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loginWithCredentials()} />
              </div>
              <div>
                <label className="text-sm font-medium">Tenant ID</label>
                <Input type="number" placeholder="1" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
              </div>
              <Button className="w-full" onClick={loginWithCredentials} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">JWT Token</label>
                <Input placeholder="Paste JWT token" value={token} onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loginWithToken()} />
                <p className="mt-1 text-xs text-muted-foreground">node scripts/generate-test-jwt.js &lt;tenant_id&gt; ma-finance-hub-dev &lt;subject&gt;</p>
              </div>
              <Button className="w-full" variant="outline" onClick={loginWithToken} disabled={loading}>{loading ? 'Verifying...' : 'Sign In with Token'}</Button>
            </div>
          )}

          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}><LoginForm /></Suspense>;
}
