// Projects service — CRUD, profitability tracking, expense linking
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class ProjectsService {
  // Generate next project number
  private async nextProjectNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('projects')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('project_number')
      .first() as Record<string, unknown> | undefined;
    if (!last) return 'PRJ-0001';
    const num = parseInt(String(last.project_number).replace('PRJ-', ''), 10);
    return `PRJ-${String(num + 1).padStart(4, '0')}`;
  }

  async create(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    name: string; contact_id?: number; description?: string; budget_type?: string;
    budget_amount?: number; hourly_rate?: number; start_date?: string; end_date?: string; notes?: string;
  }) {
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');
    const projectNumber = await this.nextProjectNumber(trx, tenantId);

    const [project] = await trx('projects').insert({
      tenant_id: tenantId,
      project_number: projectNumber,
      name: data.name,
      contact_id: data.contact_id ?? null,
      description: data.description ?? null,
      budget_type: data.budget_type ?? 'time_and_materials',
      budget_amount: data.budget_amount ?? 0,
      hourly_rate: data.hourly_rate ?? 0,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      notes: data.notes ?? null,
      status: 'active',
      actual_revenue: 0,
      actual_cost: 0,
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];
    return project;
  }

  async findAll(trx: Knex.Transaction, filters: {
    status?: string; contact_id?: number; page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('projects as p')
      .leftJoin('contacts as c', 'c.id', 'p.contact_id')
      .select('p.*', 'c.name as contact_name')
      .orderBy('p.created_at', 'desc');
    if (filters.status) void query.where('p.status', filters.status);
    if (filters.contact_id) void query.where('p.contact_id', filters.contact_id);

    const countQuery = trx('projects');
    if (filters.status) void countQuery.where('status', filters.status);
    if (filters.contact_id) void countQuery.where('contact_id', filters.contact_id);
    const [countResult] = await countQuery.count('* as total') as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOne(trx: Knex.Transaction, id: number) {
    const project = await trx('projects as p')
      .leftJoin('contacts as c', 'c.id', 'p.contact_id')
      .select('p.*', 'c.name as contact_name')
      .where('p.id', id)
      .first() as Record<string, unknown> | undefined;
    return project ?? null;
  }

  async update(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const project = await trx('projects').where({ id }).first() as Record<string, unknown> | undefined;
    if (!project) throw new NotFoundException('Project not found');
    const updates: Record<string, unknown> = {};
    for (const key of ['name', 'contact_id', 'description', 'budget_type', 'budget_amount', 'hourly_rate', 'start_date', 'end_date', 'status', 'notes']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('projects').where({ id }).update(updates);
    }
    return this.findOne(trx, id);
  }

  async delete(trx: Knex.Transaction, id: number) {
    const project = await trx('projects').where({ id }).first() as Record<string, unknown> | undefined;
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'active' && project.status !== 'on_hold') {
      throw new BadRequestException('Only active or on-hold projects can be deleted');
    }
    // Check for time entries
    const [entryCount] = await trx('time_entries').where({ project_id: id }).count('* as total') as Record<string, unknown>[];
    if (Number(entryCount.total) > 0) {
      throw new BadRequestException('Cannot delete project with time entries. Set status to cancelled instead.');
    }
    await trx('project_expenses').where({ project_id: id }).del();
    await trx('projects').where({ id }).del();
    return { deleted: true };
  }

  // Project profitability: revenue from billed time, cost from linked expenses
  async getProjectProfitability(trx: Knex.Transaction, id: number) {
    const project = await trx('projects').where({ id }).first() as Record<string, unknown> | undefined;
    if (!project) throw new NotFoundException('Project not found');

    // Revenue from time entries
    const [revenueResult] = await trx('time_entries')
      .where({ project_id: id })
      .whereIn('status', ['approved', 'billed'])
      .where('billable', true)
      .sum('total_amount as total')
      .count('* as count') as Record<string, unknown>[];
    const revenue = Number(revenueResult.total) || 0;
    const billableEntries = Number(revenueResult.count);

    // Cost from linked expenses
    const [costResult] = await trx('project_expenses as pe')
      .join('expenses as e', 'e.id', 'pe.expense_id')
      .where('pe.project_id', id)
      .sum('e.amount as total')
      .count('* as count') as Record<string, unknown>[];
    const cost = Number(costResult.total) || 0;
    const expenseCount = Number(costResult.count);

    const profit = Math.round((revenue - cost) * 100) / 100;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : 0;

    return {
      project_id: id,
      project_number: project.project_number,
      name: project.name,
      budget_amount: Number(project.budget_amount) || 0,
      revenue,
      cost,
      profit,
      margin,
      billable_entries: billableEntries,
      expense_count: expenseCount,
    };
  }

  // Time entries for a project
  async getProjectTimeEntries(trx: Knex.Transaction, id: number) {
    const rows = await trx('time_entries')
      .where({ project_id: id })
      .orderBy('date', 'desc')
      .select('*') as Record<string, unknown>[];
    return rows;
  }

  // Expenses linked to a project
  async getProjectExpenses(trx: Knex.Transaction, id: number) {
    const rows = await trx('project_expenses as pe')
      .join('expenses as e', 'e.id', 'pe.expense_id')
      .leftJoin('accounts as a', 'a.id', 'e.account_id')
      .where('pe.project_id', id)
      .select('e.*', 'a.name as account_name', 'pe.created_at as linked_at')
      .orderBy('e.date', 'desc') as Record<string, unknown>[];
    return rows;
  }

  // Link an expense to a project
  async linkExpense(trx: Knex.Transaction, projectId: number, expenseId: number, tenantId: number) {
    const project = await trx('projects').where({ id: projectId }).first() as Record<string, unknown> | undefined;
    if (!project) throw new NotFoundException('Project not found');
    const expense = await trx('expenses').where({ id: expenseId }).first() as Record<string, unknown> | undefined;
    if (!expense) throw new NotFoundException('Expense not found');

    // Check if already linked
    const existing = await trx('project_expenses').where({ project_id: projectId, expense_id: expenseId }).first() as Record<string, unknown> | undefined;
    if (existing) throw new BadRequestException('Expense is already linked to this project');

    const [link] = await trx('project_expenses').insert({
      tenant_id: tenantId,
      project_id: projectId,
      expense_id: expenseId,
    }).returning('*') as Record<string, unknown>[];

    // Update project actual_cost
    const [costResult] = await trx('project_expenses as pe')
      .join('expenses as e', 'e.id', 'pe.expense_id')
      .where('pe.project_id', projectId)
      .sum('e.amount as total') as Record<string, unknown>[];
    await trx('projects').where({ id: projectId }).update({ actual_cost: Number(costResult.total) || 0 });

    return link;
  }

  // Unlink an expense from a project
  async unlinkExpense(trx: Knex.Transaction, projectId: number, expenseId: number) {
    const deleted = await trx('project_expenses').where({ project_id: projectId, expense_id: expenseId }).del();
    if (!deleted) throw new NotFoundException('Expense link not found');

    // Update project actual_cost
    const [costResult] = await trx('project_expenses as pe')
      .join('expenses as e', 'e.id', 'pe.expense_id')
      .where('pe.project_id', projectId)
      .sum('e.amount as total') as Record<string, unknown>[];
    await trx('projects').where({ id: projectId }).update({ actual_cost: Number(costResult.total) || 0 });

    return { unlinked: true };
  }

  // Profitability report for all projects
  async getProfitabilityReport(trx: Knex.Transaction) {
    const projects = await trx('projects')
      .leftJoin('contacts as c', 'c.id', 'projects.contact_id')
      .select('projects.*', 'c.name as contact_name')
      .whereNot('projects.status', 'cancelled')
      .orderBy('projects.created_at', 'desc') as Record<string, unknown>[];

    const result: Record<string, unknown>[] = [];
    for (const project of projects) {
      const projectId = Number(project.id);

      // Revenue from billable time entries
      const [revenueResult] = await trx('time_entries')
        .where({ project_id: projectId })
        .whereIn('status', ['approved', 'billed'])
        .where('billable', true)
        .sum('total_amount as total') as Record<string, unknown>[];
      const revenue = Number(revenueResult.total) || 0;

      // Cost from linked expenses
      const [costResult] = await trx('project_expenses as pe')
        .join('expenses as e', 'e.id', 'pe.expense_id')
        .where('pe.project_id', projectId)
        .sum('e.amount as total') as Record<string, unknown>[];
      const cost = Number(costResult.total) || 0;

      const profit = Math.round((revenue - cost) * 100) / 100;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : 0;

      result.push({
        id: project.id,
        project_number: project.project_number,
        name: project.name,
        contact_name: project.contact_name,
        status: project.status,
        budget_amount: Number(project.budget_amount) || 0,
        revenue,
        cost,
        profit,
        margin,
      });
    }

    const totalRevenue = result.reduce((s, r) => s + Number(r.revenue), 0);
    const totalCost = result.reduce((s, r) => s + Number(r.cost), 0);
    const totalProfit = Math.round((totalRevenue - totalCost) * 100) / 100;

    return {
      projects: result,
      summary: {
        total_projects: result.length,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        average_margin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0,
      },
    };
  }
}
