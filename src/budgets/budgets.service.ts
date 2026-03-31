// Budgets service — CRUD budgets with lines, budget vs actual, forecasting
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class BudgetsService {
  // Create a budget with lines
  async create(trx: Knex.Transaction, tenantId: number, data: {
    name: string; fiscal_year: number; period_type: string; notes?: string;
    lines: { account_id: number; period_start: string; period_end: string; budgeted_amount: number; notes?: string }[];
  }) {
    if (!data.lines || data.lines.length === 0) {
      throw new BadRequestException('Budget must have at least one line');
    }

    const [budget] = await trx('budgets').insert({
      tenant_id: tenantId,
      name: data.name,
      fiscal_year: data.fiscal_year,
      period_type: data.period_type,
      notes: data.notes ?? null,
      status: 'draft',
    }).returning('*') as Record<string, unknown>[];

    const lineRows = data.lines.map((l) => ({
      budget_id: budget.id,
      tenant_id: tenantId,
      account_id: l.account_id,
      period_start: l.period_start,
      period_end: l.period_end,
      budgeted_amount: l.budgeted_amount,
      notes: l.notes ?? null,
    }));
    await trx('budget_lines').insert(lineRows);

    return this.findOne(trx, Number(budget.id));
  }

  // List budgets
  async findAll(trx: Knex.Transaction, filters?: {
    fiscal_year?: number; status?: string; page?: number; limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('budgets').select('*').orderBy('fiscal_year', 'desc').orderBy('name', 'asc');
    if (filters?.fiscal_year) void query.where('fiscal_year', filters.fiscal_year);
    if (filters?.status) void query.where('status', filters.status);

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];

    return {
      data: rows,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    };
  }

  // Get single budget with lines
  async findOne(trx: Knex.Transaction, id: number) {
    const budget = await trx('budgets').where({ id }).first() as Record<string, unknown> | undefined;
    if (!budget) return null;

    const lines = await trx('budget_lines')
      .where({ budget_id: id })
      .leftJoin('accounts', 'budget_lines.account_id', 'accounts.id')
      .select(
        'budget_lines.*',
        'accounts.name as account_name',
        'accounts.code as account_code',
      )
      .orderBy('budget_lines.period_start', 'asc') as Record<string, unknown>[];

    return { ...budget, lines };
  }

  // Update budget
  async update(trx: Knex.Transaction, id: number, tenantId: number, data: {
    name?: string; fiscal_year?: number; period_type?: string; notes?: string; status?: string;
    lines?: { account_id: number; period_start: string; period_end: string; budgeted_amount: number; notes?: string }[];
  }) {
    const existing = await trx('budgets').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Budget not found');

    const updates: Record<string, unknown> = {};
    const fields = ['name', 'fiscal_year', 'period_type', 'notes', 'status'] as const;
    for (const field of fields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        updates[field] = (data as Record<string, unknown>)[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('budgets').where({ id }).update(updates);
    }

    // Replace lines if provided
    if (data.lines !== undefined) {
      await trx('budget_lines').where({ budget_id: id }).delete();
      if (data.lines.length > 0) {
        const lineRows = data.lines.map((l) => ({
          budget_id: id,
          tenant_id: tenantId,
          account_id: l.account_id,
          period_start: l.period_start,
          period_end: l.period_end,
          budgeted_amount: l.budgeted_amount,
          notes: l.notes ?? null,
        }));
        await trx('budget_lines').insert(lineRows);
      }
    }

    return this.findOne(trx, id);
  }

  // Delete budget and lines
  async delete(trx: Knex.Transaction, id: number) {
    const existing = await trx('budgets').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Budget not found');

    await trx('budget_lines').where({ budget_id: id }).delete();
    await trx('budgets').where({ id }).delete();
    return { deleted: true, id };
  }

  // Budget vs Actual report
  async getBudgetVsActual(trx: Knex.Transaction, budgetId: number) {
    const budget = await trx('budgets').where({ id: budgetId }).first() as Record<string, unknown> | undefined;
    if (!budget) throw new NotFoundException('Budget not found');

    const lines = await trx('budget_lines')
      .where({ budget_id: budgetId })
      .leftJoin('accounts', 'budget_lines.account_id', 'accounts.id')
      .select(
        'budget_lines.*',
        'accounts.name as account_name',
        'accounts.code as account_code',
        'accounts.type as account_type',
      ) as Record<string, unknown>[];

    const results = [];
    for (const line of lines) {
      const accountId = Number(line.account_id);
      const periodStart = String(line.period_start);
      const periodEnd = String(line.period_end);
      const budgeted = Number(line.budgeted_amount);

      // Sum actual journal_lines for this account in the period
      const actualResult = await trx('journal_lines')
        .join('journal_entries', 'journal_lines.journal_entry_id', 'journal_entries.id')
        .where('journal_lines.account_id', accountId)
        .where('journal_entries.entry_date', '>=', periodStart)
        .where('journal_entries.entry_date', '<=', periodEnd)
        .where('journal_entries.status', 'posted')
        .select(
          trx.raw('COALESCE(SUM(journal_lines.debit), 0) as total_debit'),
          trx.raw('COALESCE(SUM(journal_lines.credit), 0) as total_credit'),
        )
        .first() as Record<string, unknown> | undefined;

      const totalDebit = Number(actualResult?.total_debit ?? 0);
      const totalCredit = Number(actualResult?.total_credit ?? 0);

      // For expense/asset accounts, actual = debit - credit
      // For revenue/liability/equity accounts, actual = credit - debit
      const accountType = String(line.account_type ?? '');
      const isDebitNormal = ['asset', 'expense'].includes(accountType);
      const actual = isDebitNormal
        ? Math.round((totalDebit - totalCredit) * 100) / 100
        : Math.round((totalCredit - totalDebit) * 100) / 100;

      const variance = Math.round((budgeted - actual) * 100) / 100;
      const variancePct = budgeted !== 0 ? Math.round((variance / budgeted) * 10000) / 100 : 0;

      // Favorable: for expenses, under budget is favorable; for revenue, over budget is favorable
      const favorable = isDebitNormal ? actual <= budgeted : actual >= budgeted;

      results.push({
        account_id: accountId,
        account_name: line.account_name,
        account_code: line.account_code,
        account_type: accountType,
        period_start: periodStart,
        period_end: periodEnd,
        budgeted,
        actual,
        variance,
        variance_pct: variancePct,
        favorable,
      });
    }

    return { budget, lines: results };
  }

  // Forecast based on last 6 months actuals (simple linear regression using average monthly growth)
  async getForecast(trx: Knex.Transaction, months: number = 6) {
    // Get top-level accounts (parent_id is null or not present)
    const accounts = await trx('accounts')
      .whereNull('parent_id')
      .select('id', 'name', 'code', 'type')
      .orderBy('code', 'asc') as Record<string, unknown>[];

    const now = new Date();
    const results = [];

    for (const account of accounts) {
      const accountId = Number(account.id);
      const accountType = String(account.type);
      const isDebitNormal = ['asset', 'expense'].includes(accountType);

      // Get monthly actuals for the last 6 months
      const monthlyActuals: number[] = [];
      for (let i = 6; i >= 1; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const startStr = start.toISOString().slice(0, 10);
        const endStr = end.toISOString().slice(0, 10);

        const result = await trx('journal_lines')
          .join('journal_entries', 'journal_lines.journal_entry_id', 'journal_entries.id')
          .where('journal_lines.account_id', accountId)
          .where('journal_entries.entry_date', '>=', startStr)
          .where('journal_entries.entry_date', '<=', endStr)
          .where('journal_entries.status', 'posted')
          .select(
            trx.raw('COALESCE(SUM(journal_lines.debit), 0) as total_debit'),
            trx.raw('COALESCE(SUM(journal_lines.credit), 0) as total_credit'),
          )
          .first() as Record<string, unknown> | undefined;

        const debit = Number(result?.total_debit ?? 0);
        const credit = Number(result?.total_credit ?? 0);
        const actual = isDebitNormal ? debit - credit : credit - debit;
        monthlyActuals.push(Math.round(actual * 100) / 100);
      }

      // Simple linear regression: average monthly change
      const changes: number[] = [];
      for (let i = 1; i < monthlyActuals.length; i++) {
        changes.push(monthlyActuals[i] - monthlyActuals[i - 1]);
      }
      const avgChange = changes.length > 0
        ? changes.reduce((s, v) => s + v, 0) / changes.length
        : 0;

      const lastActual = monthlyActuals[monthlyActuals.length - 1] ?? 0;

      // Project forward
      const projections: { month: string; projected_amount: number }[] = [];
      for (let i = 1; i <= months; i++) {
        const projDate = new Date(now.getFullYear(), now.getMonth() + i - 1, 1);
        const monthLabel = projDate.toISOString().slice(0, 7); // YYYY-MM
        const projected = Math.round((lastActual + avgChange * i) * 100) / 100;
        projections.push({ month: monthLabel, projected_amount: projected });
      }

      results.push({
        account_id: accountId,
        account_name: account.name,
        account_code: account.code,
        account_type: accountType,
        historical_monthly: monthlyActuals,
        avg_monthly_change: Math.round(avgChange * 100) / 100,
        projections,
      });
    }

    return { forecast_months: months, accounts: results };
  }
}
