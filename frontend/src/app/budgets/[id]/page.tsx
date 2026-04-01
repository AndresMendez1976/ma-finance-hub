'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/format';

interface BudgetLine {
  account_name: string; budgeted: number; actual: number;
  variance: number; variance_pct: number; favorable: boolean;
}
interface BudgetDetail { id: number; name: string; fiscal_year: number; period_type: string; status: string; lines: BudgetLine[] }

export default function BudgetDetailPage() {
  const { id } = useParams();
  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<BudgetDetail>(`/budgets/${id}/vs-actual`).then(setBudget).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!budget) return <Shell><p className="text-[#8B7355]">Budget not found</p></Shell>;

  const chartData = budget.lines.map((l) => ({
    name: l.account_name.length > 20 ? l.account_name.slice(0, 20) + '...' : l.account_name,
    Budgeted: l.budgeted,
    Actual: l.actual,
  }));

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold text-[#5C4033]">{budget.name}</h1>
      <p className="mb-4 text-sm text-[#8B7355]">FY {budget.fiscal_year} | {budget.period_type} | {budget.status}</p>

      <Card className="mb-6">
        <CardHeader><CardTitle>Budget vs Actual</CardTitle></CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC8" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8B7355' }} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#8B7355' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Budgeted" fill="#B4D4E7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-[#8B7355]">No data to chart</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Account</TH><TH className="text-right">Budgeted</TH><TH className="text-right">Actual</TH><TH className="text-right">Variance</TH><TH className="text-right">Variance %</TH><TH>Favorable</TH></TR>
            </THead>
            <TBody>
              {budget.lines.map((l, i) => (
                <TR key={i}>
                  <TD>{l.account_name}</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.budgeted)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.actual)}</TD>
                  <TD className={`text-right font-mono ${l.favorable ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>{formatCurrency(l.variance)}</TD>
                  <TD className={`text-right ${l.favorable ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>{l.variance_pct.toFixed(1)}%</TD>
                  <TD>{l.favorable ? <span className="text-[#2D6A4F] font-semibold">Yes</span> : <span className="text-[#E07A5F] font-semibold">No</span>}</TD>
                </TR>
              ))}
              {!budget.lines.length && <TR><TD colSpan={6} className="text-center text-[#8B7355]">No budget lines</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
