'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSessionToken, setMfaSessionToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');

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

      if (data.requires_mfa) {
        setMfaSessionToken(data.mfa_session_token);
        setMfaRequired(true);
        return;
      }

      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch { setError('Connection failed'); }
    finally { setLoading(false); }
  };

  const submitMfa = async () => {
    const codeValue = useBackupCode ? backupCode.trim() : mfaCode.trim();
    if (!codeValue) { setError(useBackupCode ? 'Backup code required' : 'Enter a 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const body: Record<string, string> = { mfa_session_token: mfaSessionToken };
      if (useBackupCode) {
        body.backup_code = codeValue;
      } else {
        body.token = codeValue;
      }

      const res = await fetch('/api/v1/auth/mfa/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'MFA validation failed'); return; }

      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch { setError('Connection failed'); }
    finally { setLoading(false); }
  };

  const cancelMfa = () => {
    setMfaRequired(false);
    setMfaSessionToken('');
    setMfaCode('');
    setBackupCode('');
    setUseBackupCode(false);
    setError('');
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
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">MA Finance Hub</CardTitle>
          <p className="text-sm" style={{ color: '#5C4033' }}>Powered by MAiSHQ</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {expired && <div className="rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">Session expired. Please sign in again.</div>}

          {/* MFA verification step */}
          {mfaRequired ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#2C1810]">Two-Factor Authentication</p>
              {!useBackupCode ? (
                <div>
                  <label className="text-sm font-medium text-[#2C1810]">Enter 6-digit code</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && submitMfa()}
                    className="font-mono text-lg tracking-widest"
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-[#2C1810]">Backup Code</label>
                  <Input
                    type="text"
                    placeholder="Enter backup code"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && submitMfa()}
                    className="font-mono tracking-widest"
                    autoFocus
                  />
                </div>
              )}
              <Button className="w-full" onClick={submitMfa} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs text-[#5C4033] underline hover:text-[#2C1810]"
                  onClick={() => { setUseBackupCode(!useBackupCode); setError(''); }}
                >
                  {useBackupCode ? 'Use authenticator code' : 'Use backup code instead'}
                </button>
                <button
                  type="button"
                  className="text-xs text-[#5C4033] underline hover:text-[#2C1810]"
                  onClick={cancelMfa}
                >
                  Back to login
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button size="sm" variant={mode === 'credentials' ? 'default' : 'outline'} onClick={() => setMode('credentials')}>Email & Password</Button>
                <Button size="sm" variant={mode === 'token' ? 'default' : 'outline'} onClick={() => setMode('token')}>Dev Token</Button>
              </div>

              {mode === 'credentials' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Email</label>
                    <Input type="email" placeholder="admin@demo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Password</label>
                    <Input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loginWithCredentials()} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Tenant ID</label>
                    <Input type="number" placeholder="1" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={loginWithCredentials} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">JWT Token</label>
                    <Input placeholder="Paste JWT token" value={token} onChange={(e) => setToken(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loginWithToken()} />
                    <p className="mt-1 text-xs" style={{ color: '#5C4033' }}>node scripts/generate-test-jwt.js &lt;tenant_id&gt; ma-finance-hub-dev &lt;subject&gt;</p>
                  </div>
                  <Button className="w-full" variant="outline" onClick={loginWithToken} disabled={loading}>{loading ? 'Verifying...' : 'Sign In with Token'}</Button>
                </div>
              )}
            </>
          )}

          {error && <div className="rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

          <p className="text-center text-sm" style={{ color: '#5C4033' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium underline" style={{ color: '#8B5E3C' }}>Create one</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}><LoginForm /></Suspense>;
}
