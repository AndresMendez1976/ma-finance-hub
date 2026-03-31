// Expenses service — CRUD, approval workflow, journal posting, summary
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class ExpensesService {
  // Generate next expense number
  private async nextExpenseNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('expenses')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('expense_number')
      .first() as Record<string, unknown> | undefined;
    if (!last) return 'EXP-0001';
    const num = parseInt(String(last.expense_number).replace('EXP-', ''), 10);
    return `EXP-${String(num + 1).padStart(4, '0')}`;
  }

  async create(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    date: string; vendor_name: string; category: string; account_id: number;
    payment_account_id?: number; amount: number; description?: string; reference?: string;
  }) {
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');
    const expenseNumber = await this.nextExpenseNumber(trx, tenantId);

    const [expense] = await trx('expenses').insert({
      tenant_id: tenantId,
      expense_number: expenseNumber,
      date: data.date,
      vendor_name: data.vendor_name,
      category: data.category,
      account_id: data.account_id,
      payment_account_id: data.payment_account_id ?? null,
      amount: data.amount,
      description: data.description ?? null,
      reference: data.reference ?? null,
      status: 'pending',
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];
    return expense;
  }

  async findAll(trx: Knex.Transaction, filters: {
    status?: string; category?: string; vendor?: string; from?: string; to?: string; page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('expenses as e')
      .leftJoin('accounts as a', 'a.id', 'e.account_id')
      .select('e.*', 'a.name as account_name')
      .orderBy('e.date', 'desc');
    if (filters.status) void query.where('e.status', filters.status);
    if (filters.category) void query.where('e.category', filters.category);
    if (filters.vendor) void query.whereILike('e.vendor_name', `%${filters.vendor}%`);
    if (filters.from) void query.where('e.date', '>=', filters.from);
    if (filters.to) void query.where('e.date', '<=', filters.to);

    const countQuery = trx('expenses');
    if (filters.status) void countQuery.where('status', filters.status);
    if (filters.category) void countQuery.where('category', filters.category);
    if (filters.vendor) void countQuery.whereILike('vendor_name', `%${filters.vendor}%`);
    if (filters.from) void countQuery.where('date', '>=', filters.from);
    if (filters.to) void countQuery.where('date', '<=', filters.to);
    const [countResult] = await countQuery.count('* as total') as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOne(trx: Knex.Transaction, id: number) {
    const expense = await trx('expenses as e')
      .leftJoin('accounts as a', 'a.id', 'e.account_id')
      .leftJoin('accounts as pa', 'pa.id', 'e.payment_account_id')
      .select('e.*', 'a.name as account_name', 'pa.name as payment_account_name')
      .where('e.id', id)
      .first() as Record<string, unknown> | undefined;
    return expense ?? null;
  }

  async update(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const expense = await trx('expenses').where({ id }).first() as Record<string, unknown> | undefined;
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.status !== 'pending') throw new BadRequestException('Only pending expenses can be edited');
    const updates: Record<string, unknown> = {};
    for (const key of ['date', 'vendor_name', 'category', 'account_id', 'payment_account_id', 'amount', 'description', 'reference']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('expenses').where({ id }).update(updates);
    }
    return this.findOne(trx, id);
  }

  async approve(trx: Knex.Transaction, id: number, approverSubject: string) {
    const expense = await trx('expenses').where({ id }).first() as Record<string, unknown> | undefined;
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.status !== 'pending') throw new BadRequestException(`Cannot approve expense with status '${String(expense.status)}'`);
    const user = await trx('users').where({ external_subject: approverSubject }).select('id').first() as Record<string, unknown> | undefined;
    const [updated] = await trx('expenses').where({ id }).update({ status: 'approved', approved_by: user?.id ?? null }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  async post(trx: Knex.Transaction, tenantId: number, id: number, fiscalPeriodId: number, paymentAccountIdOverride?: number) {
    const expense = await trx('expenses').where({ id }).first() as Record<string, unknown> | undefined;
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.status !== 'approved' && expense.status !== 'pending') {
      throw new BadRequestException(`Cannot post expense with status '${String(expense.status)}'`);
    }

    const period = await trx('fiscal_periods').where({ id: fiscalPeriodId }).first() as Record<string, unknown> | undefined;
    if (!period || period.status !== 'open') throw new BadRequestException('Fiscal period not found or not open');

    // Determine payment account
    const paymentAccountId = paymentAccountIdOverride ?? expense.payment_account_id;
    if (!paymentAccountId) throw new BadRequestException('Payment account required. Set payment_account_id on the expense or provide it in the request.');

    // Create journal entry: Debit expense account, Credit payment account
    const lastEntry = await trx('journal_entries')
      .where({ tenant_id: tenantId, fiscal_period_id: fiscalPeriodId })
      .max('entry_number as max_num')
      .first() as Record<string, unknown> | undefined;
    const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

    const [entry] = await trx('journal_entries').insert({
      tenant_id: tenantId,
      fiscal_period_id: fiscalPeriodId,
      entry_number: entryNumber,
      reference: `EXP-${String(expense.expense_number)}`,
      memo: `Expense: ${String(expense.vendor_name)} - ${String(expense.category)}`,
      status: 'posted',
      posted_at: trx.fn.now(),
    }).returning('*') as Record<string, unknown>[];

    await trx('journal_lines').insert([
      { tenant_id: tenantId, journal_entry_id: entry.id, account_id: expense.account_id, debit: expense.amount, credit: 0, description: `${String(expense.category)} - ${String(expense.vendor_name)}` },
      { tenant_id: tenantId, journal_entry_id: entry.id, account_id: paymentAccountId, debit: 0, credit: expense.amount, description: `Payment for ${String(expense.expense_number)}` },
    ]);

    const [updated] = await trx('expenses').where({ id }).update({
      status: 'posted',
      journal_entry_id: entry.id,
    }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  async voidExpense(trx: Knex.Transaction, tenantId: number, id: number) {
    const expense = await trx('expenses').where({ id }).first() as Record<string, unknown> | undefined;
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.status === 'voided') throw new BadRequestException('Expense is already voided');

    // Create reversal if journal entry exists
    if (expense.journal_entry_id) {
      const jeId = Number(expense.journal_entry_id);
      const entry = await trx('journal_entries').where({ id: jeId }).first() as Record<string, unknown> | undefined;
      if (entry && entry.status === 'posted') {
        const originalLines = await trx('journal_lines').where({ journal_entry_id: jeId }).select('*') as Record<string, unknown>[];
        const lastEntry = await trx('journal_entries')
          .where({ tenant_id: tenantId, fiscal_period_id: entry.fiscal_period_id })
          .max('entry_number as max_num').first() as Record<string, unknown> | undefined;
        const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

        const [reversal] = await trx('journal_entries').insert({
          tenant_id: tenantId, fiscal_period_id: entry.fiscal_period_id,
          entry_number: entryNumber,
          reference: `VOID-${String(expense.expense_number)}`,
          memo: `Reversal for voided expense ${String(expense.expense_number)}`,
          status: 'posted', posted_at: trx.fn.now(),
        }).returning('*') as Record<string, unknown>[];

        await trx('journal_lines').insert(originalLines.map((l) => ({
          tenant_id: tenantId, journal_entry_id: reversal.id,
          account_id: l.account_id, debit: Number(l.credit), credit: Number(l.debit),
          description: `Reversal: ${String(l.description || '')}`,
        })));
        await trx('journal_entries').where({ id: jeId }).update({ status: 'voided' });
      }
    }

    const [updated] = await trx('expenses').where({ id }).update({ status: 'voided' }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Summary: expenses grouped by category for a date range
  async summary(trx: Knex.Transaction, from?: string, to?: string) {
    const query = trx('expenses')
      .whereIn('status', ['approved', 'posted'])
      .groupBy('category')
      .select('category')
      .sum('amount as total')
      .count('* as count')
      .orderBy('total', 'desc');
    if (from) void query.where('date', '>=', from);
    if (to) void query.where('date', '<=', to);

    const rows = await query as Record<string, unknown>[];
    return rows.map((r) => ({ category: String(r.category), total: Number(r.total) || 0, count: Number(r.count) }));
  }
}
