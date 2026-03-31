// Reports service — generates Balance Sheet, Income Statement, Cash Flow Statement
import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

// Account type groupings for financial statements
const ASSET_TYPES = ['asset'];
const LIABILITY_TYPES = ['liability'];
const EQUITY_TYPES = ['equity'];
const REVENUE_TYPES = ['revenue'];
const EXPENSE_TYPES = ['expense'];

// Sub-grouping by account_code ranges for Balance Sheet presentation
function classifyAsset(code: string): string {
  const num = parseInt(code, 10);
  if (num < 1500) return 'Current Assets';
  if (num < 1800) return 'Fixed Assets';
  return 'Other Assets';
}

function classifyLiability(code: string): string {
  const num = parseInt(code, 10);
  if (num < 2500) return 'Current Liabilities';
  return 'Long-term Liabilities';
}

function classifyEquity(_code: string): string {
  return "Owner's Equity";
}

function classifyRevenue(_code: string): string {
  return 'Revenue';
}

interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

@Injectable()
export class ReportsService {
  // Balance Sheet — Assets = Liabilities + Equity as of a given date
  async balanceSheet(trx: Knex.Transaction, asOf: string) {
    const rows = await this.getAccountBalances(trx, undefined, asOf);

    const assets = this.groupAccounts(rows.filter((r) => ASSET_TYPES.includes(r.account_type)), classifyAsset);
    const liabilities = this.groupAccounts(rows.filter((r) => LIABILITY_TYPES.includes(r.account_type)), classifyLiability);
    const equity = this.groupAccounts(rows.filter((r) => EQUITY_TYPES.includes(r.account_type)), classifyEquity);

    // Net income flows into equity for balance sheet
    const revenueTotal = rows.filter((r) => REVENUE_TYPES.includes(r.account_type)).reduce((s, r) => s + r.balance, 0);
    const expenseTotal = rows.filter((r) => EXPENSE_TYPES.includes(r.account_type)).reduce((s, r) => s + r.balance, 0);
    const netIncome = -revenueTotal - expenseTotal; // Revenue has credit balance (negative), expenses debit (positive)

    const totalAssets = assets.reduce((s, g) => s + g.total, 0);
    const totalLiabilities = liabilities.reduce((s, g) => s + g.total, 0);
    const totalEquity = equity.reduce((s, g) => s + g.total, 0);

    return {
      as_of: asOf,
      assets: { groups: assets, total: totalAssets },
      liabilities: { groups: liabilities, total: totalLiabilities },
      equity: {
        groups: [
          ...equity,
          { category: 'Retained Earnings (Net Income)', accounts: [], total: netIncome },
        ],
        total: totalEquity + netIncome,
      },
      total_liabilities_and_equity: totalLiabilities + totalEquity + netIncome,
      is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + netIncome)) < 0.01,
    };
  }

  // Income Statement — Revenue - Expenses = Net Income for a date range
  async incomeStatement(trx: Knex.Transaction, from: string, to: string) {
    const rows = await this.getAccountBalances(trx, from, to);

    const revenue = this.groupAccounts(rows.filter((r) => REVENUE_TYPES.includes(r.account_type)), classifyRevenue);
    const cogs = this.groupAccounts(rows.filter((r) => EXPENSE_TYPES.includes(r.account_type) && parseInt(r.account_code, 10) >= 5000 && parseInt(r.account_code, 10) < 6000), () => 'Cost of Goods Sold');
    const operating = this.groupAccounts(rows.filter((r) => EXPENSE_TYPES.includes(r.account_type) && parseInt(r.account_code, 10) >= 6000 && parseInt(r.account_code, 10) < 7000), () => 'Operating Expenses');
    const other = this.groupAccounts(rows.filter((r) => EXPENSE_TYPES.includes(r.account_type) && parseInt(r.account_code, 10) >= 7000), () => 'Other Expenses');

    const totalRevenue = revenue.reduce((s, g) => s + g.total, 0);
    const totalCogs = cogs.reduce((s, g) => s + g.total, 0);
    const totalOperating = operating.reduce((s, g) => s + g.total, 0);
    const totalOther = other.reduce((s, g) => s + g.total, 0);
    const grossProfit = Math.abs(totalRevenue) - totalCogs;
    const operatingIncome = grossProfit - totalOperating;
    const netIncome = operatingIncome - totalOther;

    return {
      period: { from, to },
      revenue: { groups: revenue, total: Math.abs(totalRevenue) },
      cost_of_goods_sold: { groups: cogs, total: totalCogs },
      gross_profit: grossProfit,
      operating_expenses: { groups: operating, total: totalOperating },
      operating_income: operatingIncome,
      other_expenses: { groups: other, total: totalOther },
      net_income: netIncome,
    };
  }

  // Cash Flow Statement — indirect method, starts from Net Income
  async cashFlow(trx: Knex.Transaction, from: string, to: string) {
    const rows = await this.getAccountBalances(trx, from, to);

    // Net Income calculation (same as income statement)
    const revenueTotal = rows.filter((r) => REVENUE_TYPES.includes(r.account_type)).reduce((s, r) => s + r.balance, 0);
    const expenseTotal = rows.filter((r) => EXPENSE_TYPES.includes(r.account_type)).reduce((s, r) => s + r.balance, 0);
    const netIncome = -revenueTotal - expenseTotal;

    // Operating: non-cash adjustments from current assets/liabilities changes
    const operatingAdjustments: { name: string; amount: number }[] = [];
    for (const r of rows) {
      const code = parseInt(r.account_code, 10);
      // Depreciation add-back (expense account range 6500-6599)
      if (r.account_type === 'expense' && code >= 6500 && code < 6600) {
        operatingAdjustments.push({ name: `Add back: ${r.account_name}`, amount: r.balance });
      }
      // Changes in current assets (excluding cash 1000-1099)
      if (r.account_type === 'asset' && code >= 1100 && code < 1500) {
        operatingAdjustments.push({ name: `Change in ${r.account_name}`, amount: -r.balance });
      }
      // Changes in current liabilities
      if (r.account_type === 'liability' && code < 2500) {
        operatingAdjustments.push({ name: `Change in ${r.account_name}`, amount: -r.balance });
      }
    }

    const operatingTotal = netIncome + operatingAdjustments.reduce((s, a) => s + a.amount, 0);

    // Investing: fixed assets (1500-1999)
    const investingItems: { name: string; amount: number }[] = [];
    for (const r of rows) {
      const code = parseInt(r.account_code, 10);
      if (r.account_type === 'asset' && code >= 1500 && code < 2000) {
        investingItems.push({ name: r.account_name, amount: -r.balance });
      }
    }
    const investingTotal = investingItems.reduce((s, a) => s + a.amount, 0);

    // Financing: long-term liabilities (2500+) and equity
    const financingItems: { name: string; amount: number }[] = [];
    for (const r of rows) {
      const code = parseInt(r.account_code, 10);
      if (r.account_type === 'liability' && code >= 2500) {
        financingItems.push({ name: r.account_name, amount: -r.balance });
      }
      if (r.account_type === 'equity') {
        financingItems.push({ name: r.account_name, amount: -r.balance });
      }
    }
    const financingTotal = financingItems.reduce((s, a) => s + a.amount, 0);

    // Cash change: direct from cash accounts (1000-1099)
    const cashAccounts = rows.filter((r) => r.account_type === 'asset' && parseInt(r.account_code, 10) >= 1000 && parseInt(r.account_code, 10) < 1100);
    const netCashChange = cashAccounts.reduce((s, r) => s + r.balance, 0);

    return {
      period: { from, to },
      net_income: netIncome,
      operating: {
        adjustments: operatingAdjustments,
        total: operatingTotal,
      },
      investing: {
        items: investingItems,
        total: investingTotal,
      },
      financing: {
        items: financingItems,
        total: financingTotal,
      },
      net_cash_change: netCashChange,
      total_from_activities: operatingTotal + investingTotal + financingTotal,
    };
  }

  // Core query: aggregate posted journal lines by account with optional date filtering
  private async getAccountBalances(
    trx: Knex.Transaction,
    from: string | undefined,
    to: string,
  ): Promise<AccountBalance[]> {
    const query = trx('journal_lines as jl')
      .join('journal_entries as je', 'je.id', 'jl.journal_entry_id')
      .join('accounts as a', 'a.id', 'jl.account_id')
      .where('je.status', 'posted')
      .where('je.posted_at', '<=', `${to}T23:59:59.999Z`)
      .groupBy('a.id', 'a.account_code', 'a.name', 'a.account_type')
      .select('a.id as account_id', 'a.account_code', 'a.name as account_name', 'a.account_type')
      .sum('jl.debit as total_debit')
      .sum('jl.credit as total_credit')
      .orderBy('a.account_code');

    if (from) {
      void query.where('je.posted_at', '>=', `${from}T00:00:00.000Z`);
    }

    const rows = await query as Record<string, unknown>[];
    return rows.map((r): AccountBalance => ({
      account_id: String(r.account_id),
      account_code: String(r.account_code),
      account_name: String(r.account_name),
      account_type: String(r.account_type),
      total_debit: Number(r.total_debit) || 0,
      total_credit: Number(r.total_credit) || 0,
      balance: (Number(r.total_debit) || 0) - (Number(r.total_credit) || 0),
    }));
  }

  // Group accounts by category and compute subtotals
  private groupAccounts(
    accounts: AccountBalance[],
    classifier: (code: string) => string,
  ) {
    const groups = new Map<string, { accounts: AccountBalance[]; total: number }>();
    for (const a of accounts) {
      const cat = classifier(a.account_code);
      if (!groups.has(cat)) groups.set(cat, { accounts: [], total: 0 });
      const g = groups.get(cat)!;
      g.accounts.push(a);
      // Assets/expenses: debit balance. Liabilities/equity/revenue: credit balance (negate).
      if (a.account_type === 'liability' || a.account_type === 'equity' || a.account_type === 'revenue') {
        g.total += -a.balance;
      } else {
        g.total += a.balance;
      }
    }
    return Array.from(groups.entries()).map(([category, data]) => ({
      category,
      accounts: data.accounts.map((a) => ({
        account_code: a.account_code,
        account_name: a.account_name,
        amount: (a.account_type === 'liability' || a.account_type === 'equity' || a.account_type === 'revenue') ? -a.balance : a.balance,
      })),
      total: data.total,
    }));
  }

  // Dashboard KPIs — revenue, expenses, net income, outstanding invoices, monthly trends
  async dashboardKpis(trx: Knex.Transaction) {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const today = now.toISOString().slice(0, 10);

    // Total revenue: sum of paid invoices in current year
    const [revRow] = await trx('invoices')
      .where('status', 'paid')
      .where('paid_date', '>=', yearStart)
      .where('paid_date', '<=', today)
      .sum('paid_amount as total') as Record<string, unknown>[];
    const totalRevenue = Number(revRow?.total) || 0;

    // Total expenses: sum of posted expenses in current year
    const [expRow] = await trx('expenses')
      .where('status', 'posted')
      .where('date', '>=', yearStart)
      .where('date', '<=', today)
      .sum('amount as total') as Record<string, unknown>[];
    const totalExpenses = Number(expRow?.total) || 0;

    // Outstanding invoices: sent + overdue
    const [outRow] = await trx('invoices')
      .whereIn('status', ['sent', 'overdue'])
      .sum('total as amount')
      .count('* as count') as Record<string, unknown>[];
    const outstandingAmount = Number(outRow?.amount) || 0;
    const outstandingCount = Number(outRow?.count) || 0;

    // Monthly revenue vs expenses (last 6 months)
    const months: { month: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const [mRev] = await trx('invoices').where('status', 'paid').where('paid_date', '>=', monthStart).where('paid_date', '<=', monthEndStr).sum('paid_amount as total') as Record<string, unknown>[];
      const [mExp] = await trx('expenses').where('status', 'posted').where('date', '>=', monthStart).where('date', '<=', monthEndStr).sum('amount as total') as Record<string, unknown>[];
      months.push({ month: label, revenue: Number(mRev?.total) || 0, expenses: Number(mExp?.total) || 0 });
    }

    // Invoice status distribution
    const statusRows = await trx('invoices').groupBy('status').select('status').count('* as count') as Record<string, unknown>[];
    const invoiceStatusDistribution = statusRows.map((r) => ({ status: String(r.status), count: Number(r.count) }));

    // Top 5 overdue invoices
    const overdueInvoices = await trx('invoices')
      .whereIn('status', ['sent', 'overdue'])
      .where('due_date', '<', today)
      .orderBy('due_date', 'asc')
      .limit(5)
      .select('id', 'invoice_number', 'customer_name', 'due_date', 'total') as Record<string, unknown>[];
    const topOverdue = overdueInvoices.map((inv) => ({
      ...inv,
      days_overdue: Math.floor((now.getTime() - new Date(String(inv.due_date)).getTime()) / 86400000),
    }));

    // Top 5 recent expenses
    const recentExpenses = await trx('expenses')
      .orderBy('date', 'desc')
      .limit(5)
      .select('id', 'expense_number', 'vendor_name', 'category', 'amount', 'date', 'status') as Record<string, unknown>[];

    return {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: totalRevenue - totalExpenses,
      outstanding: { amount: outstandingAmount, count: outstandingCount },
      monthly_trends: months,
      invoice_status_distribution: invoiceStatusDistribution,
      top_overdue_invoices: topOverdue,
      recent_expenses: recentExpenses,
    };
  }

  // Aged Receivables — invoices grouped by customer with aging buckets
  async agedReceivables(trx: Knex.Transaction, asOf: string) {
    const rows = await trx('invoices')
      .whereIn('status', ['sent', 'overdue'])
      .select('*') as Record<string, unknown>[];

    const asOfDate = new Date(asOf);
    const customers = new Map<string, { current: number; d31_60: number; d61_90: number; d90plus: number; total: number }>();

    for (const inv of rows) {
      const dueDate = new Date(String(inv.due_date));
      const daysOverdue = Math.max(0, Math.floor((asOfDate.getTime() - dueDate.getTime()) / 86400000));
      const amount = Number(inv.total) - Number(inv.paid_amount);
      if (amount <= 0) continue;
      const name = String(inv.customer_name);
      if (!customers.has(name)) customers.set(name, { current: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 });
      const c = customers.get(name)!;
      if (daysOverdue <= 30) c.current += amount;
      else if (daysOverdue <= 60) c.d31_60 += amount;
      else if (daysOverdue <= 90) c.d61_90 += amount;
      else c.d90plus += amount;
      c.total += amount;
    }

    const result = Array.from(customers.entries()).map(([customer, data]) => ({ customer, ...data }));
    const totals = result.reduce((s, r) => ({
      current: s.current + r.current, d31_60: s.d31_60 + r.d31_60,
      d61_90: s.d61_90 + r.d61_90, d90plus: s.d90plus + r.d90plus, total: s.total + r.total,
    }), { current: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 });

    return { as_of: asOf, rows: result, totals };
  }

  // Aged Payables — expenses grouped by vendor with aging buckets
  async agedPayables(trx: Knex.Transaction, asOf: string) {
    const rows = await trx('expenses')
      .whereIn('status', ['pending', 'approved'])
      .select('*') as Record<string, unknown>[];

    const asOfDate = new Date(asOf);
    const vendors = new Map<string, { current: number; d31_60: number; d61_90: number; d90plus: number; total: number }>();

    for (const exp of rows) {
      const expDate = new Date(String(exp.date));
      const daysOutstanding = Math.max(0, Math.floor((asOfDate.getTime() - expDate.getTime()) / 86400000));
      const amount = Number(exp.amount);
      const name = String(exp.vendor_name);
      if (!vendors.has(name)) vendors.set(name, { current: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 });
      const v = vendors.get(name)!;
      if (daysOutstanding <= 30) v.current += amount;
      else if (daysOutstanding <= 60) v.d31_60 += amount;
      else if (daysOutstanding <= 90) v.d61_90 += amount;
      else v.d90plus += amount;
      v.total += amount;
    }

    const result = Array.from(vendors.entries()).map(([vendor, data]) => ({ vendor, ...data }));
    const totals = result.reduce((s, r) => ({
      current: s.current + r.current, d31_60: s.d31_60 + r.d31_60,
      d61_90: s.d61_90 + r.d61_90, d90plus: s.d90plus + r.d90plus, total: s.total + r.total,
    }), { current: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 });

    return { as_of: asOf, rows: result, totals };
  }
}
