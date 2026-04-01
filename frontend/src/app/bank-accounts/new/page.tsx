// New bank account form
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';

interface Account { id: number; account_code: string; name: string; account_type: string }

export default function NewBankAccountPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [institution, setInstitution] = useState('');
  const [last4, setLast4] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get<Account[]>('/accounts').then((r: unknown) => setAccounts(extractArray(r))).catch(() => {}); }, []);
  const assetAccounts = accounts.filter((a) => a.account_type === 'asset' && parseInt(a.account_code) < 1500);

  const save = async () => {
    if (!name || !accountId) { setError('Name and linked account required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/bank-accounts', { name, account_id: parseInt(accountId, 10), institution: institution || undefined, account_number_last4: last4 || undefined });
      router.push('/bank-accounts');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Bank Account</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <Card className="max-w-lg border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Account Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><label className="text-sm font-medium text-[#5C4033]">Account Name *</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chase Business Checking" /></div>
          <div><label className="text-sm font-medium text-[#5C4033]">Linked GL Account *</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]">
              <option value="">Select account</option>
              {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}
            </select>
          </div>
          <div><label className="text-sm font-medium text-[#5C4033]">Institution</label><Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Bank name" /></div>
          <div><label className="text-sm font-medium text-[#5C4033]">Last 4 Digits</label><Input value={last4} onChange={(e) => setLast4(e.target.value.slice(0, 4))} placeholder="1234" maxLength={4} /></div>
          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Create Account'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
