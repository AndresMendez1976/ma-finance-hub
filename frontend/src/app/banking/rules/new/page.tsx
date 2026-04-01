'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CONDITION_FIELDS = ['description', 'amount', 'reference', 'counterparty'];
const CONDITION_OPERATORS = ['contains', 'equals', 'starts_with', 'ends_with', 'greater_than', 'less_than'];

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Account {
  id: number;
  account_code: string;
  name: string;
  account_type: string;
}

export default function NewBankRulePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('10');
  const [conditions, setConditions] = useState<Condition[]>([
    { field: 'description', operator: 'contains', value: '' },
  ]);
  const [accountId, setAccountId] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Account[]>('/accounts').then((r: unknown) => setAccounts(extractArray(r))).catch(() => {});
  }, []);

  const addCondition = () => {
    setConditions([...conditions, { field: 'description', operator: 'contains', value: '' }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length <= 1) return;
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Name is required'); return; }
    if (!accountId) { setError('Please select an account'); return; }
    if (conditions.some((c) => !c.value.trim())) { setError('All conditions must have a value'); return; }

    setLoading(true);
    try {
      await api.post('/banking/rules', {
        name: name.trim(),
        priority: parseInt(priority, 10) || 10,
        conditions,
        account_id: parseInt(accountId, 10),
        auto_approve: autoApprove,
      });
      router.push('/banking/rules');
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/banking/rules" className="text-[#5C4033] hover:text-[#2C1810]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-[#2C1810]">New Bank Rule</h1>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#2C1810]">Rule Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md border border-[#E07A5F] bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">
                {error}
              </div>
            )}

            {/* Name and Priority */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2C1810]">Rule Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Office Supplies"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2C1810]">Priority</label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  min="1"
                  max="999"
                  placeholder="10"
                />
                <p className="mt-1 text-xs text-[#5C4033]">Lower number = higher priority</p>
              </div>
            </div>

            {/* Conditions builder */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-[#2C1810]">Conditions</label>
                <button
                  type="button"
                  onClick={addCondition}
                  className="flex items-center gap-1 text-xs font-medium text-[#2D6A4F] hover:text-[#2C1810]"
                >
                  <Plus className="h-3 w-3" />
                  Add Condition
                </button>
              </div>
              <div className="space-y-3">
                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-md border border-[#E8DCC8] bg-[#E8DCC8]/10 p-3">
                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                      className="rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus:border-[#D4A854] focus:outline-none focus:ring-1 focus:ring-[#D4A854]"
                    >
                      {CONDITION_FIELDS.map((f) => (
                        <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                      ))}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                      className="rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus:border-[#D4A854] focus:outline-none focus:ring-1 focus:ring-[#D4A854]"
                    >
                      {CONDITION_OPERATORS.map((op) => (
                        <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    <Input
                      value={cond.value}
                      onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                      placeholder="Value..."
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeCondition(idx)}
                      disabled={conditions.length <= 1}
                      className="rounded p-1 text-[#5C4033] hover:text-[#E07A5F] disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Account selector */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2C1810]">Target Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus:border-[#D4A854] focus:outline-none focus:ring-1 focus:ring-[#D4A854]"
              >
                <option value="">Select account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_code} - {a.name} ({a.account_type})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#5C4033]">
                Matching transactions will be categorized to this account
              </p>
            </div>

            {/* Auto-approve */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto_approve"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="h-4 w-4 rounded border-[#E8DCC8] text-[#2D6A4F] focus:ring-[#D4A854]"
              />
              <label htmlFor="auto_approve" className="text-sm text-[#2C1810]">
                Auto-approve matched transactions
              </label>
              <span className="text-xs text-[#5C4033]">
                (Skip manual review for matches)
              </span>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Rule'}
              </Button>
              <Link href="/banking/rules">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </Shell>
  );
}
