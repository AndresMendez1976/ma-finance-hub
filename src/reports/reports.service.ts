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

  // Executive Dashboard — comprehensive KPIs and trends for executive overview
  async getExecutiveDashboard(trx: Knex.Transaction, _tenantId: number) {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const today = now.toISOString().slice(0, 10);

    // KPIs
    let total_revenue_ytd = 0;
    let total_expenses_ytd = 0;
    let outstanding_receivables = 0;
    let outstanding_payables = 0;
    let cash_balance = 0;

    // Revenue YTD: sum of credit from journal_lines joining accounts where type='revenue'
    try {
      const [row] = await trx('journal_lines as jl')
        .join('journal_entries as je', 'je.id', 'jl.journal_entry_id')
        .join('accounts as a', 'a.id', 'jl.account_id')
        .where('je.status', 'posted')
        .where('a.account_type', 'revenue')
        .where('je.posted_at', '>=', `${yearStart}T00:00:00.000Z`)
        .where('je.posted_at', '<=', `${today}T23:59:59.999Z`)
        .sum('jl.credit as total') as Record<string, unknown>[];
      total_revenue_ytd = Number(row?.total) || 0;
    } catch { /* table may not exist */ }

    // Expenses YTD: sum of debit from journal_lines joining accounts where type='expense'
    try {
      const [row] = await trx('journal_lines as jl')
        .join('journal_entries as je', 'je.id', 'jl.journal_entry_id')
        .join('accounts as a', 'a.id', 'jl.account_id')
        .where('je.status', 'posted')
        .where('a.account_type', 'expense')
        .where('je.posted_at', '>=', `${yearStart}T00:00:00.000Z`)
        .where('je.posted_at', '<=', `${today}T23:59:59.999Z`)
        .sum('jl.debit as total') as Record<string, unknown>[];
      total_expenses_ytd = Number(row?.total) || 0;
    } catch { /* table may not exist */ }

    const net_income = total_revenue_ytd - total_expenses_ytd;

    // Outstanding receivables: sum total from invoices where status in ('sent','overdue')
    try {
      const [row] = await trx('invoices')
        .whereIn('status', ['sent', 'overdue'])
        .sum('total as amount') as Record<string, unknown>[];
      outstanding_receivables = Number(row?.amount) || 0;
    } catch { /* table may not exist */ }

    // Outstanding payables: sum amount from expenses where status in ('pending','approved')
    try {
      const [row] = await trx('expenses')
        .whereIn('status', ['pending', 'approved'])
        .sum('amount as total') as Record<string, unknown>[];
      outstanding_payables = Number(row?.total) || 0;
    } catch { /* table may not exist */ }

    // Cash balance: sum balance from bank_accounts
    try {
      const [row] = await trx('bank_accounts')
        .sum('balance as total') as Record<string, unknown>[];
      cash_balance = Number(row?.total) || 0;
    } catch { /* table may not exist */ }

    // Revenue vs Expenses — last 12 months from journal entries grouped by month
    const revenue_vs_expenses: { month: string; revenue: number; expenses: number }[] = [];
    try {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
        const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const [revRow] = await trx('journal_lines as jl')
          .join('journal_entries as je', 'je.id', 'jl.journal_entry_id')
          .join('accounts as a', 'a.id', 'jl.account_id')
          .where('je.status', 'posted')
          .where('a.account_type', 'revenue')
          .where('je.posted_at', '>=', `${monthStart}T00:00:00.000Z`)
          .where('je.posted_at', '<=', `${monthEndStr}T23:59:59.999Z`)
          .sum('jl.credit as total') as Record<string, unknown>[];

        const [expRow] = await trx('journal_lines as jl')
          .join('journal_entries as je', 'je.id', 'jl.journal_entry_id')
          .join('accounts as a', 'a.id', 'jl.account_id')
          .where('je.status', 'posted')
          .where('a.account_type', 'expense')
          .where('je.posted_at', '>=', `${monthStart}T00:00:00.000Z`)
          .where('je.posted_at', '<=', `${monthEndStr}T23:59:59.999Z`)
          .sum('jl.debit as total') as Record<string, unknown>[];

        revenue_vs_expenses.push({
          month: label,
          revenue: Number(revRow?.total) || 0,
          expenses: Number(expRow?.total) || 0,
        });
      }
    } catch { /* table may not exist */ }

    // Cash flow trend — last 6 months
    const cash_flow_trend: { month: string; inflow: number; outflow: number; net: number }[] = [];
    try {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
        const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        // Inflow: credits to cash accounts (1000-1099)
        const [inflowRow] = await trx('journal_lines as jl')
          .join('journal_entries as je', 'je.id', 'jl.journal_entry_id')
          .join('accounts as a', 'a.id', 'jl.account_id')
          .where('je.status', 'posted')
          .where('a.account_type', 'asset')
          .whereRaw("CAST(a.account_code AS INTEGER) >= 1000 AND CAST(a.account_code AS INTEGER) < 1100")
          .where('je.posted_at', '>=', `${monthStart}T00:00:00.000Z`)
          .where('je.posted_at', '<=', `${monthEndStr}T23:59:59.999Z`)
          .sum('jl.debit as total') as Record<string, unknown>[];

        const [outflowRow] = await trx('journal_lines as jl')
          .join('journal_entries as je', 'je.id', 'jl.journal_entry_id')
          .join('accounts as a', 'a.id', 'jl.account_id')
          .where('je.status', 'posted')
          .where('a.account_type', 'asset')
          .whereRaw("CAST(a.account_code AS INTEGER) >= 1000 AND CAST(a.account_code AS INTEGER) < 1100")
          .where('je.posted_at', '>=', `${monthStart}T00:00:00.000Z`)
          .where('je.posted_at', '<=', `${monthEndStr}T23:59:59.999Z`)
          .sum('jl.credit as total') as Record<string, unknown>[];

        const inflow = Number(inflowRow?.total) || 0;
        const outflow = Number(outflowRow?.total) || 0;
        cash_flow_trend.push({ month: label, inflow, outflow, net: inflow - outflow });
      }
    } catch { /* table may not exist */ }

    // Top customers — from invoices where status='paid' grouped by customer_name, top 5
    let top_customers: { name: string; revenue: number }[] = [];
    try {
      const rows = await trx('invoices')
        .where('status', 'paid')
        .groupBy('customer_name')
        .select('customer_name as name')
        .sum('paid_amount as revenue')
        .orderBy('revenue', 'desc')
        .limit(5) as Record<string, unknown>[];
      top_customers = rows.map((r) => ({ name: String(r.name), revenue: Number(r.revenue) || 0 }));
    } catch { /* table may not exist */ }

    // Invoice aging — categorize sent/overdue invoices by days since due_date
    const invoice_aging = { current: 0, days_30: 0, days_60: 0, days_90_plus: 0 };
    try {
      const rows = await trx('invoices')
        .whereIn('status', ['sent', 'overdue'])
        .select('due_date', 'total', 'paid_amount') as Record<string, unknown>[];

      for (const inv of rows) {
        const dueDate = new Date(String(inv.due_date));
        const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000));
        const amount = Number(inv.total) - Number(inv.paid_amount);
        if (amount <= 0) continue;
        if (daysOverdue <= 30) invoice_aging.current += amount;
        else if (daysOverdue <= 60) invoice_aging.days_30 += amount;
        else if (daysOverdue <= 90) invoice_aging.days_60 += amount;
        else invoice_aging.days_90_plus += amount;
      }
    } catch { /* table may not exist */ }

    // Low stock alerts — join inventory_transactions sum by product, compare with products.reorder_point
    let low_stock_alerts: { id: number; name: string; sku: string; quantity: number; reorder_point: number }[] = [];
    try {
      const rows = await trx('products as p')
        .leftJoin('inventory_transactions as it', 'it.product_id', 'p.id')
        .groupBy('p.id', 'p.name', 'p.sku', 'p.reorder_point')
        .select('p.id', 'p.name', 'p.sku', 'p.reorder_point')
        .sum('it.quantity as total_qty') as Record<string, unknown>[];

      low_stock_alerts = rows
        .filter((r) => {
          const qty = Number(r.total_qty) || 0;
          const reorderPoint = Number(r.reorder_point) || 0;
          return reorderPoint > 0 && qty <= reorderPoint;
        })
        .map((r) => ({
          id: Number(r.id),
          name: String(r.name),
          sku: String(r.sku || ''),
          quantity: Number(r.total_qty) || 0,
          reorder_point: Number(r.reorder_point),
        }));
    } catch { /* table may not exist */ }

    // Recent invoices — last 5 ordered by created_at desc
    let recent_invoices: { id: number; invoice_number: string; customer_name: string; total: string; status: string; issue_date: string }[] = [];
    try {
      const rows = await trx('invoices')
        .orderBy('created_at', 'desc')
        .limit(5)
        .select('id', 'invoice_number', 'customer_name', 'total', 'status', 'issue_date') as Record<string, unknown>[];
      recent_invoices = rows.map((r) => ({
        id: Number(r.id),
        invoice_number: String(r.invoice_number),
        customer_name: String(r.customer_name),
        total: String(r.total),
        status: String(r.status),
        issue_date: String(r.issue_date),
      }));
    } catch { /* table may not exist */ }

    // Recent expenses — last 5 ordered by created_at desc
    let recent_expenses: { id: number; expense_number: string; vendor_name: string; amount: string; status: string; date: string }[] = [];
    try {
      const rows = await trx('expenses')
        .orderBy('created_at', 'desc')
        .limit(5)
        .select('id', 'expense_number', 'vendor_name', 'amount', 'status', 'date') as Record<string, unknown>[];
      recent_expenses = rows.map((r) => ({
        id: Number(r.id),
        expense_number: String(r.expense_number),
        vendor_name: String(r.vendor_name),
        amount: String(r.amount),
        status: String(r.status),
        date: String(r.date),
      }));
    } catch { /* table may not exist */ }

    return {
      kpis: {
        total_revenue_ytd,
        total_expenses_ytd,
        net_income,
        outstanding_receivables,
        outstanding_payables,
        cash_balance,
      },
      revenue_vs_expenses,
      cash_flow_trend,
      top_customers,
      invoice_aging,
      low_stock_alerts,
      recent_invoices,
      recent_expenses,
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

  // Trial Balance — all accounts with debit/credit totals as of a date
  async trialBalance(trx: Knex.Transaction, asOf: string) {
    const rows = await this.getAccountBalances(trx, undefined, asOf);

    const accounts = rows.map((r) => {
      const debit = r.balance > 0 ? r.balance : 0;
      const credit = r.balance < 0 ? -r.balance : 0;
      return {
        account_code: r.account_code,
        account_name: r.account_name,
        account_type: r.account_type,
        debit,
        credit,
      };
    });

    const totalDebit = accounts.reduce((s, a) => s + a.debit, 0);
    const totalCredit = accounts.reduce((s, a) => s + a.credit, 0);

    return {
      as_of: asOf,
      accounts,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }

  // Financial Ratios — calculate all key ratios from account balances
  async getFinancialRatios(trx: Knex.Transaction, _tenantId: number) {
    const today = new Date().toISOString().slice(0, 10);
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const balances = await this.getAccountBalances(trx, undefined, today);
    const periodBalances = await this.getAccountBalances(trx, yearStart, today);

    // Helper to sum balances by account type and code range
    const sumByType = (rows: AccountBalance[], type: string, minCode?: number, maxCode?: number) => {
      return rows.filter((r) => {
        if (r.account_type !== type) return false;
        if (minCode !== undefined || maxCode !== undefined) {
          const code = parseInt(r.account_code, 10);
          if (minCode !== undefined && code < minCode) return false;
          if (maxCode !== undefined && code >= maxCode) return false;
        }
        return true;
      }).reduce((s, r) => s + Math.abs(r.balance), 0);
    };

    // Balance sheet items
    const currentAssets = sumByType(balances, 'asset', 1000, 1500);
    const totalAssets = sumByType(balances, 'asset');
    const currentLiabilities = sumByType(balances, 'liability', 2000, 2500);
    const totalLiabilities = sumByType(balances, 'liability');
    const totalEquity = sumByType(balances, 'equity');
    const inventory = sumByType(balances, 'asset', 1200, 1300);
    const receivables = sumByType(balances, 'asset', 1100, 1200);

    // Income statement items (period)
    const revenue = sumByType(periodBalances, 'revenue');
    const totalExpenses = sumByType(periodBalances, 'expense');
    const cogs = sumByType(periodBalances, 'expense', 5000, 6000);
    const netIncome = revenue - totalExpenses;

    // Liquidity ratios
    const currentRatio = currentLiabilities > 0 ? Math.round((currentAssets / currentLiabilities) * 100) / 100 : 0;
    const quickRatio = currentLiabilities > 0 ? Math.round(((currentAssets - inventory) / currentLiabilities) * 100) / 100 : 0;

    // Profitability ratios
    const grossProfitMargin = revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 10000) / 100 : 0;
    const netProfitMargin = revenue > 0 ? Math.round((netIncome / revenue) * 10000) / 100 : 0;
    const returnOnAssets = totalAssets > 0 ? Math.round((netIncome / totalAssets) * 10000) / 100 : 0;
    const returnOnEquity = totalEquity > 0 ? Math.round((netIncome / totalEquity) * 10000) / 100 : 0;

    // Leverage ratios
    const debtToEquity = totalEquity > 0 ? Math.round((totalLiabilities / totalEquity) * 100) / 100 : 0;
    const debtToAssets = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 10000) / 100 : 0;

    // Activity ratios
    const receivablesTurnover = receivables > 0 ? Math.round((revenue / receivables) * 100) / 100 : 0;
    const daysReceivables = receivablesTurnover > 0 ? Math.round(365 / receivablesTurnover) : 0;
    const inventoryTurnover = inventory > 0 ? Math.round((cogs / inventory) * 100) / 100 : 0;
    const daysInventory = inventoryTurnover > 0 ? Math.round(365 / inventoryTurnover) : 0;

    return {
      as_of: today,
      period: { from: yearStart, to: today },
      liquidity: {
        current_ratio: currentRatio,
        quick_ratio: quickRatio,
        working_capital: Math.round((currentAssets - currentLiabilities) * 100) / 100,
      },
      profitability: {
        gross_profit_margin: grossProfitMargin,
        net_profit_margin: netProfitMargin,
        return_on_assets: returnOnAssets,
        return_on_equity: returnOnEquity,
      },
      leverage: {
        debt_to_equity: debtToEquity,
        debt_to_assets: debtToAssets,
      },
      activity: {
        receivables_turnover: receivablesTurnover,
        days_receivables: daysReceivables,
        inventory_turnover: inventoryTurnover,
        days_inventory: daysInventory,
      },
    };
  }

  // 1099 Summary — vendors with is_1099_eligible, sum expenses+bills paid
  async get1099Summary(trx: Knex.Transaction) {
    const threshold = 600; // IRS 1099-NEC threshold

    // Get 1099-eligible contacts
    const contacts = await trx('contacts')
      .where({ is_1099_eligible: true, status: 'active' })
      .select('id', 'first_name', 'last_name', 'company_name', 'tax_id') as Record<string, unknown>[];

    const vendors: { vendor_name: string; tax_id: string; total_paid: number; threshold_met: boolean }[] = [];

    for (const contact of contacts) {
      const contactId = Number(contact.id);
      const vendorName = contact.company_name
        ? String(contact.company_name)
        : `${String(contact.first_name)} ${String(contact.last_name ?? '')}`.trim();

      // Sum from expenses
      let totalPaid = 0;
      try {
        const [expRow] = await trx('expenses')
          .where({ contact_id: contactId })
          .whereIn('status', ['posted', 'approved'])
          .sum('amount as total') as Record<string, unknown>[];
        totalPaid += Number(expRow?.total) || 0;
      } catch { /* table may not have contact_id */ }

      // Sum from bills
      try {
        const [billRow] = await trx('bills')
          .where({ contact_id: contactId })
          .whereIn('status', ['paid'])
          .sum('total as total') as Record<string, unknown>[];
        totalPaid += Number(billRow?.total) || 0;
      } catch { /* bills table may not exist */ }

      vendors.push({
        vendor_name: vendorName,
        tax_id: String(contact.tax_id ?? ''),
        total_paid: Math.round(totalPaid * 100) / 100,
        threshold_met: totalPaid >= threshold,
      });
    }

    return {
      threshold,
      vendors: vendors.sort((a, b) => b.total_paid - a.total_paid),
      total_vendors: vendors.length,
      vendors_over_threshold: vendors.filter((v) => v.threshold_met).length,
    };
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
