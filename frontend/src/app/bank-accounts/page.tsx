// Bank accounts list — balances and unreconciled counts
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Plus, Eye } from 'lucide-react';

interface BankAccount { id: number; name: string; institution: string | null; account_number_last4: string | null; currency: string; current_balance: string; status: string; unreconciled_count: number }

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<BankAccount[]>('/bank-accounts').then(setAccounts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Bank Accounts</h1>
        <Link href="/bank-accounts/new"><Button><Plus className="mr-2 h-4 w-4" />New Account</Button></Link>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          {loading ? <p className="text-center text-[#8B7355]">Loading...</p> : (
            <Table>
              <THead><TR><TH>Account</TH><TH>Institution</TH><TH>Last 4</TH><TH className="text-right">Balance</TH><TH>Unreconciled</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
              <TBody>
                {accounts.map((a) => (
                  <TR key={a.id}>
                    <TD className="font-medium">{a.name}</TD>
                    <TD>{a.institution || '—'}</TD>
                    <TD className="font-mono">{a.account_number_last4 ? `****${a.account_number_last4}` : '—'}</TD>
                    <TD className="text-right font-mono font-bold">${Number(a.current_balance).toFixed(2)}</TD>
                    <TD>{Number(a.unreconciled_count) > 0 ? <Badge variant="warning">{a.unreconciled_count}</Badge> : <Badge variant="success">0</Badge>}</TD>
                    <TD><Badge variant={a.status === 'active' ? 'success' : 'secondary'}>{a.status}</Badge></TD>
                    <TD><Link href={`/bank-accounts/${a.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                  </TR>
                ))}
                {accounts.length === 0 && <TR><TD colSpan={7} className="text-center text-[#8B7355]">No bank accounts configured</TD></TR>}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
