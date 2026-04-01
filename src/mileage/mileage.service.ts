// Mileage service — recurring expenses, mileage entries, expense creation, summary
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

// Default IRS standard mileage rate (2026)
const DEFAULT_MILEAGE_RATE = 0.70;

@Injectable()
export class MileageService {
  // ─── Recurring Expenses CRUD ───────────────────────────────────────────────

  async createRecurringExpense(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    name: string; description?: string; account_id: number; payment_account_id?: number;
    amount: number; frequency: string; start_date: string; end_date?: string;
    vendor_name?: string; category?: string;
  }) {
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    const [row] = await trx('recurring_expenses').insert({
      tenant_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      account_id: data.account_id,
      payment_account_id: data.payment_account_id ?? null,
      amount: data.amount,
      frequency: data.frequency,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      vendor_name: data.vendor_name ?? null,
      category: data.category ?? null,
      status: 'active',
      next_date: data.start_date,
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];
    return row;
  }

  async findAllRecurringExpenses(trx: Knex.Transaction, filters: {
    status?: string; frequency?: string; page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('recurring_expenses').select('*').orderBy('next_date');
    if (filters.status) void query.where('status', filters.status);
    if (filters.frequency) void query.where('frequency', filters.frequency);

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOneRecurringExpense(trx: Knex.Transaction, id: number) {
    const row = await trx('recurring_expenses').where({ id }).first() as Record<string, unknown> | undefined;
    return row ?? null;
  }

  async updateRecurringExpense(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const existing = await trx('recurring_expenses').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Recurring expense not found');
    const updates: Record<string, unknown> = {};
    for (const key of ['name', 'description', 'account_id', 'payment_account_id', 'amount', 'frequency', 'start_date', 'end_date', 'vendor_name', 'category', 'status', 'next_date']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('recurring_expenses').where({ id }).update(updates);
    }
    return this.findOneRecurringExpense(trx, id);
  }

  async deleteRecurringExpense(trx: Knex.Transaction, id: number) {
    const existing = await trx('recurring_expenses').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Recurring expense not found');
    const [updated] = await trx('recurring_expenses').where({ id }).update({ status: 'inactive' }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  // ─── Mileage Entries CRUD ──────────────────────────────────────────────────

  async createMileageEntry(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    date: string; miles: number; rate_per_mile?: number; purpose?: string;
    from_location?: string; to_location?: string; project_id?: number;
    account_id?: number; vehicle?: string;
  }) {
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    const rate = data.rate_per_mile ?? DEFAULT_MILEAGE_RATE;
    const amount = Math.round(data.miles * rate * 100) / 100;

    const [row] = await trx('mileage_entries').insert({
      tenant_id: tenantId,
      date: data.date,
      miles: data.miles,
      rate_per_mile: rate,
      amount: amount,
      purpose: data.purpose ?? null,
      from_location: data.from_location ?? null,
      to_location: data.to_location ?? null,
      project_id: data.project_id ?? null,
      account_id: data.account_id ?? null,
      vehicle: data.vehicle ?? null,
      status: 'pending',
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];
    return row;
  }

  async findAllMileageEntries(trx: Knex.Transaction, filters: {
    status?: string; project_id?: number; from?: string; to?: string;
    page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('mileage_entries').select('*').orderBy('date', 'desc');
    if (filters.status) void query.where('status', filters.status);
    if (filters.project_id) void query.where('project_id', filters.project_id);
    if (filters.from) void query.where('date', '>=', filters.from);
    if (filters.to) void query.where('date', '<=', filters.to);

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOneMileageEntry(trx: Knex.Transaction, id: number) {
    const row = await trx('mileage_entries').where({ id }).first() as Record<string, unknown> | undefined;
    return row ?? null;
  }

  async updateMileageEntry(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const existing = await trx('mileage_entries').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Mileage entry not found');
    if (existing.status !== 'pending') throw new BadRequestException('Only pending entries can be edited');
    const updates: Record<string, unknown> = {};
    for (const key of ['date', 'miles', 'rate_per_mile', 'purpose', 'from_location', 'to_location', 'project_id', 'account_id', 'vehicle']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    // Recalculate amount if miles or rate changed
    if (updates.miles !== undefined || updates.rate_per_mile !== undefined) {
      const miles = Number(updates.miles ?? existing.miles);
      const rate = Number(updates.rate_per_mile ?? existing.rate_per_mile);
      updates.amount = Math.round(miles * rate * 100) / 100;
    }
    if (Object.keys(updates).length > 0) {
      await trx('mileage_entries').where({ id }).update(updates);
    }
    return this.findOneMileageEntry(trx, id);
  }

  async deleteMileageEntry(trx: Knex.Transaction, id: number) {
    const existing = await trx('mileage_entries').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Mileage entry not found');
    if (existing.status !== 'pending') throw new BadRequestException('Only pending entries can be deleted');
    await trx('mileage_entries').where({ id }).del();
    return { deleted: true };
  }

  // ─── Create Expense from Mileage ──────────────────────────────────────────

  async createExpenseFromMileage(trx: Knex.Transaction, tenantId: number, id: number, createdBy: string) {
    const entry = await trx('mileage_entries').where({ id }).first() as Record<string, unknown> | undefined;
    if (!entry) throw new NotFoundException('Mileage entry not found');
    if (entry.status === 'expensed') throw new BadRequestException('Mileage entry already expensed');

    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    // Get next expense number
    const lastExpense = await trx('expenses')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('expense_number')
      .first() as Record<string, unknown> | undefined;
    let expenseNumber = 'EXP-0001';
    if (lastExpense) {
      const num = parseInt(String(lastExpense.expense_number).replace('EXP-', ''), 10);
      expenseNumber = `EXP-${String(num + 1).padStart(4, '0')}`;
    }

    const amount = Number(entry.amount) || 0;
    const [expense] = await trx('expenses').insert({
      tenant_id: tenantId,
      expense_number: expenseNumber,
      date: entry.date,
      vendor_name: 'Mileage Reimbursement',
      category: 'mileage',
      account_id: entry.account_id ?? null,
      amount: amount,
      description: `Mileage: ${String(entry.miles)} mi @ $${String(entry.rate_per_mile)}/mi - ${String(entry.purpose ?? '')}`,
      reference: `Mileage Entry #${String(id)}`,
      status: 'pending',
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];

    // Update mileage entry status
    await trx('mileage_entries').where({ id }).update({
      status: 'expensed',
      expense_id: expense.id,
    });

    return expense;
  }

  // ─── Mileage Summary Report ────────────────────────────────────────────────

  async getMileageSummary(trx: Knex.Transaction, filters: {
    from?: string; to?: string; project_id?: number;
  }) {
    const query = trx('mileage_entries')
      .select(
        trx.raw("TO_CHAR(date, 'YYYY-MM') as period"),
        trx.raw('COALESCE(SUM(miles), 0) as total_miles'),
        trx.raw('COALESCE(SUM(amount), 0) as total_amount'),
        trx.raw('COUNT(*) as entry_count'),
      )
      .groupByRaw("TO_CHAR(date, 'YYYY-MM')")
      .orderByRaw("TO_CHAR(date, 'YYYY-MM')");
    if (filters.from) void query.where('date', '>=', filters.from);
    if (filters.to) void query.where('date', '<=', filters.to);
    if (filters.project_id) void query.where('project_id', filters.project_id);

    const rows = await query as Record<string, unknown>[];

    const totalMiles = rows.reduce((s, r) => s + (Number(r.total_miles) || 0), 0);
    const totalAmount = rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

    return {
      periods: rows.map((r) => ({
        period: String(r.period),
        total_miles: Number(r.total_miles) || 0,
        total_amount: Number(r.total_amount) || 0,
        entry_count: Number(r.entry_count),
      })),
      totals: {
        total_miles: totalMiles,
        total_amount: Math.round(totalAmount * 100) / 100,
      },
    };
  }
}
