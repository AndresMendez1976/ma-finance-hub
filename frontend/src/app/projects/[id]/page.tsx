'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatDate, formatCurrency } from '@/lib/format';

const fmt = (n: number) => formatCurrency(n);

interface TimeEntry { id: number; date: string; description: string; duration_minutes: number; billable: boolean; hourly_rate: string; user_name: string; }
interface Expense { id: number; expense_number: string; description: string; amount: string; date: string; category: string; }
interface Project {
  id: number; name: string; client_name: string; description: string; status: string;
  budget_type: string; budget_amount: string; hourly_rate: string; start_date: string; end_date: string;
  total_revenue: string; total_cost: string; profit: string; notes: string;
  time_entries: TimeEntry[]; expenses: Expense[];
}

const TABS = ['Overview', 'Time Entries', 'Expenses', 'Profitability'] as const;

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { data: proj, loading } = useApi<Project>(`/projects/${id}`);
  const [tab, setTab] = useState<typeof TABS[number]>('Overview');

  if (loading || !proj) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;

  const profit = Number(proj.profit);
  const revenue = Number(proj.total_revenue);
  const cost = Number(proj.total_cost);
  const profitData = [
    { name: 'Revenue', amount: revenue },
    { name: 'Cost', amount: cost },
    { name: 'Profit', amount: profit },
  ];

  return (
    <Shell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#5C4033]">{proj.name}</h1>
        <p className="text-sm text-[#8B7355]">{proj.client_name} &middot; {proj.status}</p>
      </div>

      <div className="mb-4 flex gap-1 rounded-md border border-[#E8DCC8] bg-white p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-[#2D6A4F] text-white' : 'text-[#5C4033] hover:bg-[#E8DCC8]'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-[#E8DCC8]"><CardContent className="pt-6">
            <p className="text-xs font-medium text-[#8B7355]">Budget</p>
            <p className="text-2xl font-bold text-[#5C4033]">{fmt(Number(proj.budget_amount))}</p>
            <p className="text-xs text-[#8B7355] capitalize">{proj.budget_type}</p>
          </CardContent></Card>
          <Card className="border-[#E8DCC8]"><CardContent className="pt-6">
            <p className="text-xs font-medium text-[#8B7355]">Revenue</p>
            <p className="text-2xl font-bold text-[#2D6A4F]">{fmt(revenue)}</p>
          </CardContent></Card>
          <Card className="border-[#E8DCC8]"><CardContent className="pt-6">
            <p className="text-xs font-medium text-[#8B7355]">Cost</p>
            <p className="text-2xl font-bold text-[#E07A5F]">{fmt(cost)}</p>
          </CardContent></Card>
          <Card className="border-[#E8DCC8]"><CardContent className="pt-6">
            <p className="text-xs font-medium text-[#8B7355]">Profit</p>
            <p className="text-2xl font-bold" style={{ color: profit >= 0 ? '#2D6A4F' : '#E07A5F' }}>{fmt(profit)}</p>
          </CardContent></Card>
          {proj.description && <Card className="border-[#E8DCC8] md:col-span-2"><CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-[#5C4033]">{proj.description}</p></CardContent></Card>}
          <Card className="border-[#E8DCC8] md:col-span-2"><CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-[#8B7355]">Hourly Rate</span><span>{fmt(Number(proj.hourly_rate))}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Start</span><span>{proj.start_date ? formatDate(proj.start_date) : '---'}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">End</span><span>{proj.end_date ? formatDate(proj.end_date) : '---'}</span></div>
              {proj.notes && <div className="mt-2 rounded bg-[#E8DCC8]/30 p-2 text-[#8B7355]">{proj.notes}</div>}
            </CardContent></Card>
        </div>
      )}

      {tab === 'Time Entries' && (
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-6">
            <Table>
              <THead><TR><TH>Date</TH><TH>User</TH><TH>Description</TH><TH className="text-right">Hours</TH><TH>Billable</TH><TH className="text-right">Rate</TH></TR></THead>
              <TBody>
                {proj.time_entries?.map((te) => (
                  <TR key={te.id}>
                    <TD>{formatDate(te.date)}</TD><TD>{te.user_name}</TD><TD>{te.description}</TD>
                    <TD className="text-right font-mono">{(te.duration_minutes / 60).toFixed(1)}</TD>
                    <TD>{te.billable ? <span className="text-[#2D6A4F] font-semibold">Yes</span> : <span className="text-[#8B7355]">No</span>}</TD>
                    <TD className="text-right font-mono">{fmt(Number(te.hourly_rate))}</TD>
                  </TR>
                ))}
                {(!proj.time_entries || proj.time_entries.length === 0) && (
                  <TR><TD colSpan={6} className="text-center text-[#8B7355]">No time entries</TD></TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'Expenses' && (
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-6">
            <Table>
              <THead><TR><TH>Date</TH><TH>#</TH><TH>Description</TH><TH>Category</TH><TH className="text-right">Amount</TH></TR></THead>
              <TBody>
                {proj.expenses?.map((exp) => (
                  <TR key={exp.id}>
                    <TD>{formatDate(exp.date)}</TD><TD className="font-mono text-sm">{exp.expense_number}</TD>
                    <TD>{exp.description}</TD><TD>{exp.category}</TD>
                    <TD className="text-right font-mono">{fmt(Number(exp.amount))}</TD>
                  </TR>
                ))}
                {(!proj.expenses || proj.expenses.length === 0) && (
                  <TR><TD colSpan={5} className="text-center text-[#8B7355]">No expenses</TD></TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'Profitability' && (
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle>Revenue vs Cost</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC8" />
                <XAxis dataKey="name" tick={{ fill: '#8B7355', fontSize: 12 }} />
                <YAxis tick={{ fill: '#8B7355', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderColor: '#E8DCC8', borderRadius: 8 }} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {profitData.map((entry, i) => (
                    <Cell key={i} fill={i === 0 ? '#2D6A4F' : i === 1 ? '#E07A5F' : (entry.amount >= 0 ? '#2D6A4F' : '#E07A5F')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
