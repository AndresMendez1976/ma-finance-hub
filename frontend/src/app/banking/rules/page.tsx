'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { Plus, Settings2 } from 'lucide-react';

interface Condition { field: string; operator: string; value: string; }
interface BankRule {
  id: number; name: string; priority: number; conditions: Condition[];
  account_name: string; auto_approve: boolean;
}

export default function BankRulesPage() {
  const [data, setData] = useState<BankRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get<BankRule[]>('/banking/rules'); setData(extractArray(res)); setInitialLoad(false); }
    catch { /* handled */ } finally { setLoading(false); }
  }, []);

  if (initialLoad && !loading) { void load(); }

  const conditionsSummary = (conditions: Condition[]) =>
    conditions.map((c) => `${c.field} ${c.operator} "${c.value}"`).join(', ');

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Bank Rules</h1>
        <Link href="/banking/rules/new"><Button><Plus className="mr-2 h-4 w-4" />New Rule</Button></Link>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Name</TH><TH className="text-center">Priority</TH><TH>Conditions</TH><TH>Account</TH><TH className="text-center">Auto-Approve</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={5} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data.map((rule) => (
                <TR key={rule.id}>
                  <TD className="font-medium">{rule.name}</TD>
                  <TD className="text-center">{rule.priority}</TD>
                  <TD className="text-sm text-[#8B7355] max-w-xs truncate">{conditionsSummary(rule.conditions)}</TD>
                  <TD>{rule.account_name}</TD>
                  <TD className="text-center">
                    {rule.auto_approve
                      ? <span className="inline-flex items-center rounded-full bg-[#2D6A4F] px-2.5 py-0.5 text-xs font-semibold text-white">Auto</span>
                      : <span className="inline-flex items-center rounded-full bg-[#E8DCC8] px-2.5 py-0.5 text-xs font-semibold text-[#8B7355]">Manual</span>}
                  </TD>
                </TR>
              ))}
              {!loading && data.length === 0 && (
                <TR><TD colSpan={5} className="text-center text-[#8B7355]">
                  <Settings2 className="mx-auto mb-2 h-8 w-8 opacity-40" />No bank rules configured
                </TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
