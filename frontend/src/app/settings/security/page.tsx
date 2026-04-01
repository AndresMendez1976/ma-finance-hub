'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

type MfaStatus = 'loading' | 'disabled' | 'setup' | 'verify' | 'enabled' | 'backup_codes';

interface SetupResponse {
  secret: string;
  qr_code_data_url: string;
  backup_codes: string[];
}

export default function SecurityPage() {
  const [status, setStatus] = useState<MfaStatus>('loading');
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Check MFA status by fetching auth context
    api.get<{ user: { mfaEnabled?: boolean } }>('/auth/context')
      .then((ctx) => {
        setStatus(ctx.user.mfaEnabled ? 'enabled' : 'disabled');
      })
      .catch(() => setStatus('disabled'))
  }, []);

  const startSetup = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.post<SetupResponse>('/auth/mfa/setup');
      setSetupData(data);
      setStatus('setup');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const verifySetup = async () => {
    if (!verifyCode || verifyCode.length !== 6) { setError('Enter a 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/mfa/verify-setup', { token: verifyCode });
      if (setupData) {
        setBackupCodes(setupData.backup_codes);
      }
      setStatus('backup_codes');
      setMsg('MFA enabled successfully');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const confirmBackupCodes = () => {
    setStatus('enabled');
    setSetupData(null);
    setBackupCodes([]);
    setVerifyCode('');
  };

  const disableMfa = async () => {
    if (!disableCode || !disablePassword) { setError('Both fields required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/mfa/disable', { token: disableCode, password: disablePassword });
      setStatus('disabled');
      setDisableCode('');
      setDisablePassword('');
      setMsg('MFA disabled');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  if (status === 'loading') return <Shell><p className="text-[#5C4033]">Loading security settings...</p></Shell>;

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold text-[#2C1810]">Security Settings</h1>
      {msg && <div className={`mb-4 rounded-md p-3 text-sm ${msg.includes('success') || msg.includes('disabled') ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]' : 'bg-[#E07A5F]/10 text-[#E07A5F]'}`}>{msg}</div>}
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#2C1810]">Two-Factor Authentication (TOTP)</CardTitle>
        </CardHeader>
        <CardContent>
          {/* MFA Disabled — show enable button */}
          {status === 'disabled' && (
            <div className="space-y-3">
              <p className="text-sm text-[#5C4033]">
                Add an extra layer of security to your account by enabling two-factor authentication.
                You will need an authenticator app like Google Authenticator, Authy, or 1Password.
              </p>
              <Button onClick={startSetup} disabled={loading}>
                {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
              </Button>
            </div>
          )}

          {/* Setup — show QR code */}
          {status === 'setup' && setupData && (
            <div className="space-y-4">
              <p className="text-sm text-[#2C1810]">
                Scan this QR code with your authenticator app, then enter the 6-digit verification code below.
              </p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setupData.qr_code_data_url} alt="MFA QR Code" className="h-48 w-48 rounded-md border border-[#E8DCC8]" />
              </div>
              <div className="rounded-md bg-[#F5F0E8] p-3">
                <p className="text-xs font-medium text-[#5C4033]">Manual entry key:</p>
                <p className="mt-1 font-mono text-sm text-[#2C1810] select-all">{setupData.secret}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Verification Code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && verifySetup()}
                  className="mt-1 max-w-xs font-mono text-lg tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={verifySetup} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify and Enable'}
                </Button>
                <Button variant="outline" onClick={() => { setStatus('disabled'); setSetupData(null); setVerifyCode(''); setError(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Backup codes display (one-time) */}
          {status === 'backup_codes' && (
            <div className="space-y-4">
              <div className="rounded-md bg-[#2D6A4F]/10 p-3">
                <p className="text-sm font-medium text-[#2D6A4F]">
                  Two-factor authentication is now enabled.
                </p>
              </div>
              <p className="text-sm text-[#2C1810]">
                Save these backup codes in a secure place. Each code can only be used once.
                If you lose access to your authenticator app, you can use a backup code to sign in.
              </p>
              <div className="rounded-md border border-[#E8DCC8] bg-[#F5F0E8] p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <span key={i} className="font-mono text-sm text-[#2C1810]">{code}</span>
                  ))}
                </div>
              </div>
              <Button onClick={confirmBackupCodes}>I have saved my backup codes</Button>
            </div>
          )}

          {/* MFA Enabled — show status + disable */}
          {status === 'enabled' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#2D6A4F]" />
                <span className="text-sm font-medium text-[#2D6A4F]">Two-factor authentication is enabled</span>
              </div>
              <hr className="border-[#E8DCC8]" />
              <p className="text-sm text-[#5C4033]">To disable MFA, enter your current TOTP code and password.</p>
              <div className="grid gap-3 max-w-sm">
                <div>
                  <label className="text-sm font-medium text-[#2C1810]">Current TOTP Code</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                    className="font-mono tracking-widest"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2C1810]">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && disableMfa()}
                  />
                </div>
                <Button variant="outline" onClick={disableMfa} disabled={loading} className="text-[#E07A5F] border-[#E07A5F]/30 hover:bg-[#E07A5F]/10">
                  {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
