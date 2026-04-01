'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface TenantOption {
  id: number;
  company_name: string;
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get('expired');

  // Tenant selection state
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [showTenantSelection, setShowTenantSelection] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSessionToken, setMfaSessionToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  const doLogin = async (tenantId?: number) => {
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true); setError('');
    try {
      const body: Record<string, unknown> = { email, password };
      if (tenantId) body.tenant_id = tenantId;

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Login failed'); return; }

      if (data.requires_tenant_selection) {
        setTenants(data.tenants || []);
        setShowTenantSelection(true);
        if (data.tenants?.length === 1) {
          setSelectedTenantId(data.tenants[0].id);
        }
        return;
      }

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

  const handleLogin = () => doLogin();

  const handleTenantSelect = () => {
    if (!selectedTenantId) { setError('Please select a company'); return; }
    setShowTenantSelection(false);
    doLogin(selectedTenantId);
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

  const backToLogin = () => {
    setShowTenantSelection(false);
    setTenants([]);
    setSelectedTenantId(null);
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
      <Card className="w-full max-w-md border-[#E8DCC8]">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold text-[#2C1810]">MA Finance Hub</h1>
          <p className="text-sm text-[#5C4033]">Sign in to your account</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {expired && <div className="rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">Session expired. Please sign in again.</div>}
          {error && <div className="rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

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
              <Button className="w-full bg-[#2D6A4F] hover:bg-[#245a42]" onClick={submitMfa} disabled={loading}>
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

          /* Tenant selection step */
          ) : showTenantSelection ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#2C1810]">Select a company</p>
              <select
                className="w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                value={selectedTenantId ?? ''}
                onChange={(e) => setSelectedTenantId(Number(e.target.value))}
              >
                <option value="" disabled>Choose a company...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.company_name}</option>
                ))}
              </select>
              <Button className="w-full bg-[#2D6A4F] hover:bg-[#245a42]" onClick={handleTenantSelect} disabled={loading}>
                {loading ? 'Signing in...' : 'Continue'}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-[#5C4033] underline hover:text-[#2C1810]"
                onClick={backToLogin}
              >
                Back to login
              </button>
            </div>

          /* Login form */
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Email</label>
                <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Password</label>
                <Input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
              </div>
              <Button className="w-full bg-[#2D6A4F] hover:bg-[#245a42]" onClick={handleLogin} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="text-center">
                <a href="mailto:support@maishq.com" className="text-xs text-[#5C4033] underline hover:text-[#2C1810]">
                  Forgot password?
                </a>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-[#5C4033]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-[#2C1810] underline hover:text-[#5C4033]">Create one</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">Loading...</div>}><LoginForm /></Suspense>;
}
