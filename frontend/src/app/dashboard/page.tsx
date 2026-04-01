// Dashboard — KPIs, charts, recent activity, system info
'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useApi } from '@/hooks/use-api';
import { DollarSign, TrendingDown, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/format';

// Interfaces for KPI data
interface KpiData {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  outstanding: { amount: number; count: number };
  monthly_trends: { month: string; revenue: number; expenses: number }[];
  invoice_status_distribution: { status: string; count: number }[];
  top_overdue_invoices: { id: number; invoice_number: string; customer_name: string; due_date: string; total: string; days_overdue: number }[];
  recent_expenses: { id: number; expense_number: string; vendor_name: string; category: string; amount: string; date: string; status: string }[];
}

// Pie chart colors for invoice statuses
const STATUS_COLORS: Record<string, string> = {
  draft: '#B4D4E7', sent: '#D4A854', paid: '#2D6A4F', overdue: '#E07A5F', voided: '#8B7355',
};

// Format currency
const fmt = (n: number) => formatCurrency(n);

export default function DashboardPage() {
  const { context } = useAuth();
  const { data: kpis } = useApi<KpiData>('/reports/dashboard-kpis');
  const { data: tier } = useApi<{ tier: { tierCode: string } | null; entitlements: { key: string; enabled: boolean | null; limitValue: number | null }[] }>('/tiers/current');
  const { data: lockDate } = useApi<{ lock_date: string | null }>('/admin/lock-date');
  const { data: users } = useApi<{ user_id: string }[]>('/admin/users');
  const { data: charts } = useApi<{ id: string }[]>('/chart-of-accounts');
  const { data: entries } = useApi<{ id: string; status: string }[]>('/journal-entries');
  const [sysInfoOpen, setSysInfoOpen] = useState(false);

  const netIncome = kpis?.net_income ?? 0;

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold text-[#5C4033]">Dashboard</h1>

      {/* Row 1: KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#E8DCC8] border-l-4" style={{ borderLeftColor: '#2D6A4F' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#8B7355]">Total Revenue</p>
                <p className="text-2xl font-bold text-[#5C4033]">{kpis ? fmt(kpis.total_revenue) : '—'}</p>
                <p className="text-xs text-[#8B7355]">Year to date</p>
              </div>
              <DollarSign className="h-8 w-8 text-[#2D6A4F]/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8] border-l-4" style={{ borderLeftColor: '#E07A5F' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#8B7355]">Total Expenses</p>
                <p className="text-2xl font-bold text-[#5C4033]">{kpis ? fmt(kpis.total_expenses) : '—'}</p>
                <p className="text-xs text-[#8B7355]">Year to date</p>
              </div>
              <TrendingDown className="h-8 w-8 text-[#E07A5F]/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8] border-l-4" style={{ borderLeftColor: netIncome >= 0 ? '#2D6A4F' : '#E07A5F' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#8B7355]">Net Income</p>
                <p className="text-2xl font-bold" style={{ color: netIncome >= 0 ? '#2D6A4F' : '#E07A5F' }}>
                  {kpis ? fmt(netIncome) : '—'}
                </p>
                <p className="text-xs text-[#8B7355]">Revenue - Expenses</p>
              </div>
              <TrendingUp className="h-8 w-8" style={{ color: netIncome >= 0 ? '#2D6A4F40' : '#E07A5F40' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8] border-l-4" style={{ borderLeftColor: '#B4D4E7' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#8B7355]">Outstanding Invoices</p>
                <p className="text-2xl font-bold text-[#5C4033]">{kpis ? fmt(kpis.outstanding.amount) : '—'}</p>
                <p className="text-xs text-[#8B7355]">{kpis?.outstanding.count ?? 0} invoice{(kpis?.outstanding.count ?? 0) !== 1 ? 's' : ''}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-[#B4D4E7]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Revenue vs Expenses bar chart */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Revenue vs Expenses (6 months)</CardTitle></CardHeader>
          <CardContent>
            {kpis?.monthly_trends && kpis.monthly_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={kpis.monthly_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC8" />
                  <XAxis dataKey="month" tick={{ fill: '#8B7355', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#8B7355', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderColor: '#E8DCC8', borderRadius: 8 }} />
                  <Bar dataKey="revenue" fill="#2D6A4F" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#E07A5F" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-[#8B7355]">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Invoice status pie chart */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Invoice Status Distribution</CardTitle></CardHeader>
          <CardContent>
            {kpis?.invoice_status_distribution && kpis.invoice_status_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={kpis.invoice_status_distribution} dataKey="count" nameKey="status" cx="50%" cy="50%"
                    outerRadius={100} label>
                    {kpis.invoice_status_distribution.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#8B7355'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-[#8B7355]">No invoices yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Lists */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Overdue invoices */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Overdue Invoices</CardTitle></CardHeader>
          <CardContent>
            {kpis?.top_overdue_invoices && kpis.top_overdue_invoices.length > 0 ? (
              <div className="space-y-3">
                {kpis.top_overdue_invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-md border border-[#E8DCC8] p-3">
                    <div>
                      <p className="font-medium text-[#5C4033]">{inv.customer_name}</p>
                      <p className="text-xs text-[#8B7355]">{inv.invoice_number} &middot; Due {formatDate(inv.due_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-[#E07A5F]">{formatCurrency(inv.total)}</p>
                      <p className="text-xs text-[#E07A5F]">{inv.days_overdue} days overdue</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-[#8B7355]">No overdue invoices</p>
            )}
          </CardContent>
        </Card>

        {/* Recent expenses */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Recent Expenses</CardTitle></CardHeader>
          <CardContent>
            {kpis?.recent_expenses && kpis.recent_expenses.length > 0 ? (
              <div className="space-y-3">
                {kpis.recent_expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between rounded-md border border-[#E8DCC8] p-3">
                    <div>
                      <p className="font-medium text-[#5C4033]">{exp.vendor_name}</p>
                      <p className="text-xs text-[#8B7355]">{exp.expense_number} &middot; {exp.category} &middot; {formatDate(exp.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-[#5C4033]">{formatCurrency(exp.amount)}</p>
                      <Badge variant={exp.status === 'posted' ? 'success' : exp.status === 'approved' ? 'warning' : 'info'}>{exp.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-[#8B7355]">No expenses yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collapsible System Info */}
      <div className="mt-6">
        <button onClick={() => setSysInfoOpen(!sysInfoOpen)}
          className="flex w-full items-center justify-between rounded-md border border-[#E8DCC8] bg-white px-4 py-3 text-left text-sm font-medium text-[#5C4033] hover:bg-[#E8DCC8]/30">
          System Info
          {sysInfoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {sysInfoOpen && (
          <div className="mt-2 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[#E8DCC8]">
              <CardHeader><CardTitle className="text-sm font-medium text-[#8B7355]">Tenant</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{context?.jwt.tenantId}</p><p className="text-xs text-[#8B7355]">ID</p></CardContent>
            </Card>
            <Card className="border-[#E8DCC8]">
              <CardHeader><CardTitle className="text-sm font-medium text-[#8B7355]">Tier</CardTitle></CardHeader>
              <CardContent><Badge variant="outline" className="text-lg">{tier?.tier?.tierCode?.toUpperCase() || 'None'}</Badge></CardContent>
            </Card>
            <Card className="border-[#E8DCC8]">
              <CardHeader><CardTitle className="text-sm font-medium text-[#8B7355]">Users</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{users?.length ?? '—'}</p></CardContent>
            </Card>
            <Card className="border-[#E8DCC8]">
              <CardHeader><CardTitle className="text-sm font-medium text-[#8B7355]">Lock Date</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-semibold">{lockDate?.lock_date || 'Not set'}</p></CardContent>
            </Card>
            <Card className="border-[#E8DCC8] md:col-span-2">
              <CardHeader><CardTitle>Entitlements</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tier?.entitlements?.map((e) => (
                    <div key={e.key} className="flex items-center justify-between text-sm">
                      <span>{e.key}</span>
                      {e.enabled !== null ? <Badge variant={e.enabled ? 'success' : 'destructive'}>{e.enabled ? 'ON' : 'OFF'}</Badge>
                        : <span className="font-mono">{e.limitValue}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#E8DCC8] md:col-span-2">
              <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span>Charts of Accounts</span><span className="font-bold">{charts?.length ?? 0}</span></div>
                <div className="flex justify-between text-sm"><span>Journal Entries</span><span className="font-bold">{entries?.length ?? 0}</span></div>
                <div className="flex justify-between text-sm"><span>Posted</span><span className="font-bold">{entries?.filter((e) => e.status === 'posted').length ?? 0}</span></div>
                <div className="flex justify-between text-sm"><span>Role</span><Badge variant="secondary">{context?.membership.role}</Badge></div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Shell>
  );
}
