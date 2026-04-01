// Job Costing service — cost codes, entries, earned value, change orders, progress billings, reports
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class JobCostingService {
  // ─── Cost Codes ────────────────────────────────────────────────────────────

  async createCostCode(trx: Knex.Transaction, tenantId: number, data: {
    code: string; name: string; description?: string; parent_id?: number;
  }) {
    if (data.parent_id) {
      const parent = await trx('cost_codes').where({ id: data.parent_id, tenant_id: tenantId }).first() as Record<string, unknown> | undefined;
      if (!parent) throw new BadRequestException('Parent cost code not found');
    }
    const [row] = await trx('cost_codes').insert({
      tenant_id: tenantId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      parent_id: data.parent_id ?? null,
    }).returning('*') as Record<string, unknown>[];
    return row;
  }

  async findAllCostCodes(trx: Knex.Transaction, filters: { parent_id?: number; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('cost_codes').select('*').orderBy('code');
    if (filters.parent_id !== undefined) void query.where('parent_id', filters.parent_id);

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOneCostCode(trx: Knex.Transaction, id: number) {
    const row = await trx('cost_codes').where({ id }).first() as Record<string, unknown> | undefined;
    return row ?? null;
  }

  async updateCostCode(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const existing = await trx('cost_codes').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Cost code not found');
    const updates: Record<string, unknown> = {};
    for (const key of ['code', 'name', 'description', 'parent_id']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('cost_codes').where({ id }).update(updates);
    }
    return this.findOneCostCode(trx, id);
  }

  async deleteCostCode(trx: Knex.Transaction, id: number) {
    const existing = await trx('cost_codes').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Cost code not found');
    const children = await trx('cost_codes').where({ parent_id: id }).first() as Record<string, unknown> | undefined;
    if (children) throw new BadRequestException('Cannot delete cost code with children');
    await trx('cost_codes').where({ id }).del();
    return { deleted: true };
  }

  // ─── Job Cost Entries ──────────────────────────────────────────────────────

  async createJobCostEntry(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    project_id: number; cost_code_id: number; date: string; source_type: string;
    description?: string; quantity: number; unit?: string; unit_cost: number;
    total_cost: number; budgeted_quantity?: number; budgeted_cost?: number;
    source_id?: number; reference?: string;
  }) {
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    const [entry] = await trx('job_cost_entries').insert({
      tenant_id: tenantId,
      project_id: data.project_id,
      cost_code_id: data.cost_code_id,
      date: data.date,
      source_type: data.source_type,
      description: data.description ?? null,
      quantity: data.quantity,
      unit: data.unit ?? null,
      unit_cost: data.unit_cost,
      total_cost: data.total_cost,
      budgeted_quantity: data.budgeted_quantity ?? null,
      budgeted_cost: data.budgeted_cost ?? null,
      source_id: data.source_id ?? null,
      reference: data.reference ?? null,
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];
    return entry;
  }

  async findAllJobCostEntries(trx: Knex.Transaction, filters: {
    project_id?: number; cost_code_id?: number; source_type?: string;
    from?: string; to?: string; page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('job_cost_entries as jce')
      .leftJoin('cost_codes as cc', 'cc.id', 'jce.cost_code_id')
      .leftJoin('projects as p', 'p.id', 'jce.project_id')
      .select('jce.*', 'cc.code as cost_code', 'cc.name as cost_code_name', 'p.name as project_name')
      .orderBy('jce.date', 'desc');
    if (filters.project_id) void query.where('jce.project_id', filters.project_id);
    if (filters.cost_code_id) void query.where('jce.cost_code_id', filters.cost_code_id);
    if (filters.source_type) void query.where('jce.source_type', filters.source_type);
    if (filters.from) void query.where('jce.date', '>=', filters.from);
    if (filters.to) void query.where('jce.date', '<=', filters.to);

    const countQuery = trx('job_cost_entries');
    if (filters.project_id) void countQuery.where('project_id', filters.project_id);
    if (filters.cost_code_id) void countQuery.where('cost_code_id', filters.cost_code_id);
    if (filters.source_type) void countQuery.where('source_type', filters.source_type);
    if (filters.from) void countQuery.where('date', '>=', filters.from);
    if (filters.to) void countQuery.where('date', '<=', filters.to);
    const [countResult] = await countQuery.count('* as total') as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOneJobCostEntry(trx: Knex.Transaction, id: number) {
    const row = await trx('job_cost_entries as jce')
      .leftJoin('cost_codes as cc', 'cc.id', 'jce.cost_code_id')
      .leftJoin('projects as p', 'p.id', 'jce.project_id')
      .select('jce.*', 'cc.code as cost_code', 'cc.name as cost_code_name', 'p.name as project_name')
      .where('jce.id', id)
      .first() as Record<string, unknown> | undefined;
    return row ?? null;
  }

  async updateJobCostEntry(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const existing = await trx('job_cost_entries').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Job cost entry not found');
    const updates: Record<string, unknown> = {};
    for (const key of ['project_id', 'cost_code_id', 'date', 'source_type', 'description', 'quantity', 'unit', 'unit_cost', 'total_cost', 'budgeted_quantity', 'budgeted_cost', 'source_id', 'reference']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('job_cost_entries').where({ id }).update(updates);
    }
    return this.findOneJobCostEntry(trx, id);
  }

  async deleteJobCostEntry(trx: Knex.Transaction, id: number) {
    const existing = await trx('job_cost_entries').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Job cost entry not found');
    await trx('job_cost_entries').where({ id }).del();
    return { deleted: true };
  }

  // ─── Cost Summary ──────────────────────────────────────────────────────────

  async getCostSummary(trx: Knex.Transaction, projectId: number) {
    const rows = await trx('job_cost_entries as jce')
      .leftJoin('cost_codes as cc', 'cc.id', 'jce.cost_code_id')
      .where('jce.project_id', projectId)
      .groupBy('jce.cost_code_id', 'cc.code', 'cc.name')
      .select(
        'jce.cost_code_id',
        'cc.code as cost_code',
        'cc.name as cost_code_name',
        trx.raw('COALESCE(SUM(jce.budgeted_quantity), 0) as budgeted_qty'),
        trx.raw('COALESCE(SUM(jce.budgeted_cost), 0) as budgeted_cost'),
        trx.raw('COALESCE(SUM(jce.quantity), 0) as actual_qty'),
        trx.raw('COALESCE(SUM(jce.total_cost), 0) as actual_cost'),
      ) as Record<string, unknown>[];

    return rows.map((r) => {
      const budgetedCost = Number(r.budgeted_cost) || 0;
      const actualCost = Number(r.actual_cost) || 0;
      const variance = budgetedCost - actualCost;
      const percentComplete = budgetedCost > 0 ? Math.round((actualCost / budgetedCost) * 10000) / 100 : 0;
      return {
        cost_code_id: Number(r.cost_code_id),
        cost_code: String(r.cost_code),
        cost_code_name: String(r.cost_code_name),
        budgeted_qty: Number(r.budgeted_qty) || 0,
        budgeted_cost: budgetedCost,
        actual_qty: Number(r.actual_qty) || 0,
        actual_cost: actualCost,
        variance,
        percent_complete: percentComplete,
      };
    });
  }

  // ─── Earned Value ──────────────────────────────────────────────────────────

  async getEarnedValue(trx: Knex.Transaction, projectId: number) {
    const [totals] = await trx('job_cost_entries')
      .where({ project_id: projectId })
      .select(
        trx.raw('COALESCE(SUM(budgeted_cost), 0) as total_budget'),
        trx.raw('COALESCE(SUM(total_cost), 0) as total_actual'),
      ) as Record<string, unknown>[];

    const budget = Number(totals.total_budget) || 0;
    const acwp = Number(totals.total_actual) || 0;

    // Estimate BCWP from % complete weighted by budget
    const costSummary = await this.getCostSummary(trx, projectId);
    let bcwp = 0;
    for (const cs of costSummary) {
      bcwp += (cs.percent_complete / 100) * cs.budgeted_cost;
    }

    const bcws = budget; // Planned value = total budget (simplified; full schedule-based EV requires schedule data)
    const spi = bcws > 0 ? Math.round((bcwp / bcws) * 10000) / 10000 : 0;
    const cpi = acwp > 0 ? Math.round((bcwp / acwp) * 10000) / 10000 : 0;
    const eac = cpi > 0 ? Math.round((budget / cpi) * 100) / 100 : 0;
    const etc = Math.round((eac - acwp) * 100) / 100;

    return {
      bcws,
      bcwp: Math.round(bcwp * 100) / 100,
      acwp,
      spi,
      cpi,
      eac,
      etc,
      budget,
    };
  }

  // ─── Unit Price Items ──────────────────────────────────────────────────────

  async createUnitPriceItem(trx: Knex.Transaction, tenantId: number, data: {
    project_id: number; description: string; unit: string;
    contract_quantity: number; unit_price: number; cost_code_id?: number;
  }) {
    const [row] = await trx('unit_price_items').insert({
      tenant_id: tenantId,
      project_id: data.project_id,
      description: data.description,
      unit: data.unit,
      contract_quantity: data.contract_quantity,
      unit_price: data.unit_price,
      quantity_completed: 0,
      cost_code_id: data.cost_code_id ?? null,
    }).returning('*') as Record<string, unknown>[];
    return row;
  }

  async findAllUnitPriceItems(trx: Knex.Transaction, filters: { project_id?: number; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('unit_price_items').select('*').orderBy('id');
    if (filters.project_id) void query.where('project_id', filters.project_id);

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOneUnitPriceItem(trx: Knex.Transaction, id: number) {
    const row = await trx('unit_price_items').where({ id }).first() as Record<string, unknown> | undefined;
    return row ?? null;
  }

  async updateUnitPriceItem(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const existing = await trx('unit_price_items').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Unit price item not found');
    const updates: Record<string, unknown> = {};
    for (const key of ['description', 'unit', 'contract_quantity', 'unit_price', 'quantity_completed', 'cost_code_id']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('unit_price_items').where({ id }).update(updates);
    }
    return this.findOneUnitPriceItem(trx, id);
  }

  async deleteUnitPriceItem(trx: Knex.Transaction, id: number) {
    const existing = await trx('unit_price_items').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Unit price item not found');
    await trx('unit_price_items').where({ id }).del();
    return { deleted: true };
  }

  async updateQuantities(trx: Knex.Transaction, projectId: number, items: { unit_price_item_id: number; quantity_completed: number }[]) {
    const results: Record<string, unknown>[] = [];
    for (const item of items) {
      const existing = await trx('unit_price_items')
        .where({ id: item.unit_price_item_id, project_id: projectId })
        .first() as Record<string, unknown> | undefined;
      if (!existing) throw new NotFoundException(`Unit price item ${item.unit_price_item_id} not found for project ${projectId}`);
      const [updated] = await trx('unit_price_items')
        .where({ id: item.unit_price_item_id })
        .update({ quantity_completed: item.quantity_completed })
        .returning('*') as Record<string, unknown>[];
      results.push(updated);
    }
    return results;
  }

  // ─── Change Orders ─────────────────────────────────────────────────────────

  private async nextChangeOrderNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('change_orders')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('change_order_number')
      .first() as Record<string, unknown> | undefined;
    if (!last) return 'CO-001';
    const num = parseInt(String(last.change_order_number).replace('CO-', ''), 10);
    return `CO-${String(num + 1).padStart(3, '0')}`;
  }

  async createChangeOrder(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    project_id: number; title: string; description?: string; date: string;
    amount: number; cost_code_id?: number;
  }) {
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');
    const changeOrderNumber = await this.nextChangeOrderNumber(trx, tenantId);

    const [row] = await trx('change_orders').insert({
      tenant_id: tenantId,
      project_id: data.project_id,
      change_order_number: changeOrderNumber,
      title: data.title,
      description: data.description ?? null,
      date: data.date,
      amount: data.amount,
      cost_code_id: data.cost_code_id ?? null,
      status: 'pending',
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];
    return row;
  }

  async findAllChangeOrders(trx: Knex.Transaction, filters: {
    project_id?: number; status?: string; page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('change_orders as co')
      .leftJoin('projects as p', 'p.id', 'co.project_id')
      .select('co.*', 'p.name as project_name')
      .orderBy('co.date', 'desc');
    if (filters.project_id) void query.where('co.project_id', filters.project_id);
    if (filters.status) void query.where('co.status', filters.status);

    const countQuery = trx('change_orders');
    if (filters.project_id) void countQuery.where('project_id', filters.project_id);
    if (filters.status) void countQuery.where('status', filters.status);
    const [countResult] = await countQuery.count('* as total') as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOneChangeOrder(trx: Knex.Transaction, id: number) {
    const row = await trx('change_orders as co')
      .leftJoin('projects as p', 'p.id', 'co.project_id')
      .select('co.*', 'p.name as project_name')
      .where('co.id', id)
      .first() as Record<string, unknown> | undefined;
    return row ?? null;
  }

  async updateChangeOrder(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const existing = await trx('change_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Change order not found');
    if (existing.status !== 'pending') throw new BadRequestException('Only pending change orders can be edited');
    const updates: Record<string, unknown> = {};
    for (const key of ['title', 'description', 'date', 'amount', 'cost_code_id']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('change_orders').where({ id }).update(updates);
    }
    return this.findOneChangeOrder(trx, id);
  }

  async approveChangeOrder(trx: Knex.Transaction, id: number, approverSubject: string) {
    const existing = await trx('change_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Change order not found');
    if (existing.status !== 'pending') throw new BadRequestException(`Cannot approve change order with status '${String(existing.status)}'`);
    const user = await trx('users').where({ external_subject: approverSubject }).select('id').first() as Record<string, unknown> | undefined;
    const [updated] = await trx('change_orders').where({ id }).update({
      status: 'approved',
      approved_by: user?.id ?? null,
      approved_at: trx.fn.now(),
    }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  async deleteChangeOrder(trx: Knex.Transaction, id: number) {
    const existing = await trx('change_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Change order not found');
    if (existing.status === 'approved') throw new BadRequestException('Cannot delete approved change orders');
    await trx('change_orders').where({ id }).del();
    return { deleted: true };
  }

  // ─── Progress Billings ─────────────────────────────────────────────────────

  private async nextProgressBillingNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('progress_billings')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('billing_number')
      .first() as Record<string, unknown> | undefined;
    if (!last) return 'PB-001';
    const num = parseInt(String(last.billing_number).replace('PB-', ''), 10);
    return `PB-${String(num + 1).padStart(3, '0')}`;
  }

  async createProgressBilling(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    project_id: number; billing_date: string; notes?: string;
    lines: { cost_code_id?: number; description: string; amount: number; retention_percent?: number }[];
  }) {
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');
    const billingNumber = await this.nextProgressBillingNumber(trx, tenantId);

    const totalAmount = data.lines.reduce((s, l) => s + l.amount, 0);
    const totalRetention = data.lines.reduce((s, l) => s + (l.amount * (l.retention_percent ?? 0) / 100), 0);

    const [billing] = await trx('progress_billings').insert({
      tenant_id: tenantId,
      project_id: data.project_id,
      billing_number: billingNumber,
      billing_date: data.billing_date,
      total_amount: totalAmount,
      retention_amount: Math.round(totalRetention * 100) / 100,
      net_amount: Math.round((totalAmount - totalRetention) * 100) / 100,
      notes: data.notes ?? null,
      status: 'draft',
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];

    for (const line of data.lines) {
      await trx('progress_billing_lines').insert({
        tenant_id: tenantId,
        progress_billing_id: billing.id,
        cost_code_id: line.cost_code_id ?? null,
        description: line.description,
        amount: line.amount,
        retention_percent: line.retention_percent ?? 0,
      });
    }

    return this.findOneProgressBilling(trx, Number(billing.id));
  }

  async findAllProgressBillings(trx: Knex.Transaction, filters: {
    project_id?: number; status?: string; page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('progress_billings as pb')
      .leftJoin('projects as p', 'p.id', 'pb.project_id')
      .select('pb.*', 'p.name as project_name')
      .orderBy('pb.billing_date', 'desc');
    if (filters.project_id) void query.where('pb.project_id', filters.project_id);
    if (filters.status) void query.where('pb.status', filters.status);

    const countQuery = trx('progress_billings');
    if (filters.project_id) void countQuery.where('project_id', filters.project_id);
    if (filters.status) void countQuery.where('status', filters.status);
    const [countResult] = await countQuery.count('* as total') as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOneProgressBilling(trx: Knex.Transaction, id: number) {
    const billing = await trx('progress_billings as pb')
      .leftJoin('projects as p', 'p.id', 'pb.project_id')
      .select('pb.*', 'p.name as project_name')
      .where('pb.id', id)
      .first() as Record<string, unknown> | undefined;
    if (!billing) return null;

    const lines = await trx('progress_billing_lines')
      .where({ progress_billing_id: id })
      .select('*') as Record<string, unknown>[];

    return { ...billing, lines };
  }

  async updateProgressBilling(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const existing = await trx('progress_billings').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Progress billing not found');
    if (existing.status !== 'draft') throw new BadRequestException('Only draft progress billings can be edited');
    const updates: Record<string, unknown> = {};
    for (const key of ['billing_date', 'notes']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('progress_billings').where({ id }).update(updates);
    }
    return this.findOneProgressBilling(trx, id);
  }

  async submitProgressBilling(trx: Knex.Transaction, id: number) {
    const existing = await trx('progress_billings').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Progress billing not found');
    if (existing.status !== 'draft') throw new BadRequestException(`Cannot submit billing with status '${String(existing.status)}'`);
    const [updated] = await trx('progress_billings').where({ id }).update({ status: 'submitted' }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  async approveProgressBilling(trx: Knex.Transaction, id: number, approverSubject: string) {
    const existing = await trx('progress_billings').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Progress billing not found');
    if (existing.status !== 'submitted') throw new BadRequestException(`Cannot approve billing with status '${String(existing.status)}'`);
    const user = await trx('users').where({ external_subject: approverSubject }).select('id').first() as Record<string, unknown> | undefined;
    const [updated] = await trx('progress_billings').where({ id }).update({
      status: 'approved',
      approved_by: user?.id ?? null,
      approved_at: trx.fn.now(),
    }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  async createInvoiceFromBilling(trx: Knex.Transaction, tenantId: number, billingId: number, createdBy: string) {
    const billing = await trx('progress_billings').where({ id: billingId }).first() as Record<string, unknown> | undefined;
    if (!billing) throw new NotFoundException('Progress billing not found');
    if (billing.status !== 'approved') throw new BadRequestException('Only approved billings can be invoiced');

    const project = await trx('projects').where({ id: billing.project_id }).first() as Record<string, unknown> | undefined;
    if (!project) throw new BadRequestException('Project not found');

    // Get next invoice number
    const lastInvoice = await trx('invoices')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('invoice_number')
      .first() as Record<string, unknown> | undefined;
    let invoiceNumber = 'INV-0001';
    if (lastInvoice) {
      const num = parseInt(String(lastInvoice.invoice_number).replace('INV-', ''), 10);
      invoiceNumber = `INV-${String(num + 1).padStart(4, '0')}`;
    }

    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;

    const lines = await trx('progress_billing_lines')
      .where({ progress_billing_id: billingId })
      .select('*') as Record<string, unknown>[];

    const netAmount = Number(billing.net_amount) || 0;
    const [invoice] = await trx('invoices').insert({
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      customer_name: String(project.client_name ?? project.name),
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      subtotal: netAmount,
      tax: 0,
      total: netAmount,
      paid_amount: 0,
      status: 'draft',
      notes: `Progress Billing ${String(billing.billing_number)} for project ${String(project.name)}`,
      created_by: user?.id ?? null,
    }).returning('*') as Record<string, unknown>[];

    // Create invoice lines from billing lines
    for (const line of lines) {
      await trx('invoice_lines').insert({
        tenant_id: tenantId,
        invoice_id: invoice.id,
        description: String(line.description),
        quantity: 1,
        unit_price: Number(line.amount),
        amount: Number(line.amount),
      });
    }

    // Update billing status
    await trx('progress_billings').where({ id: billingId }).update({
      status: 'invoiced',
      invoice_id: invoice.id,
    });

    return invoice;
  }

  async deleteProgressBilling(trx: Knex.Transaction, id: number) {
    const existing = await trx('progress_billings').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Progress billing not found');
    if (existing.status !== 'draft') throw new BadRequestException('Only draft billings can be deleted');
    await trx('progress_billing_lines').where({ progress_billing_id: id }).del();
    await trx('progress_billings').where({ id }).del();
    return { deleted: true };
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  async getJobCostDetailReport(trx: Knex.Transaction, projectId?: number) {
    const query = trx('job_cost_entries as jce')
      .leftJoin('cost_codes as cc', 'cc.id', 'jce.cost_code_id')
      .leftJoin('projects as p', 'p.id', 'jce.project_id')
      .select(
        'p.id as project_id', 'p.name as project_name',
        'cc.id as cost_code_id', 'cc.code as cost_code', 'cc.name as cost_code_name',
        trx.raw('COALESCE(SUM(jce.budgeted_cost), 0) as budgeted_cost'),
        trx.raw('COALESCE(SUM(jce.total_cost), 0) as actual_cost'),
        trx.raw('COALESCE(SUM(jce.budgeted_quantity), 0) as budgeted_qty'),
        trx.raw('COALESCE(SUM(jce.quantity), 0) as actual_qty'),
        trx.raw('COUNT(*) as entry_count'),
      )
      .groupBy('p.id', 'p.name', 'cc.id', 'cc.code', 'cc.name')
      .orderBy('p.name')
      .orderBy('cc.code');
    if (projectId) void query.where('jce.project_id', projectId);

    const rows = await query as Record<string, unknown>[];
    return rows.map((r) => {
      const budgeted = Number(r.budgeted_cost) || 0;
      const actual = Number(r.actual_cost) || 0;
      return {
        project_id: Number(r.project_id),
        project_name: String(r.project_name),
        cost_code_id: Number(r.cost_code_id),
        cost_code: String(r.cost_code),
        cost_code_name: String(r.cost_code_name),
        budgeted_qty: Number(r.budgeted_qty) || 0,
        budgeted_cost: budgeted,
        actual_qty: Number(r.actual_qty) || 0,
        actual_cost: actual,
        variance: budgeted - actual,
        percent_complete: budgeted > 0 ? Math.round((actual / budgeted) * 10000) / 100 : 0,
        entry_count: Number(r.entry_count),
      };
    });
  }

  async getWipReport(trx: Knex.Transaction) {
    const projects = await trx('projects')
      .select('id', 'name', 'contract_amount', 'estimated_cost', 'status') as Record<string, unknown>[];

    const results: Record<string, unknown>[] = [];
    for (const project of projects) {
      const projectId = Number(project.id);
      const contractAmount = Number(project.contract_amount) || 0;

      const [costRow] = await trx('job_cost_entries')
        .where({ project_id: projectId })
        .select(
          trx.raw('COALESCE(SUM(total_cost), 0) as costs_to_date'),
          trx.raw('COALESCE(SUM(budgeted_cost), 0) as total_budgeted'),
        ) as Record<string, unknown>[];

      const costsToDate = Number(costRow.costs_to_date) || 0;
      const estimatedTotal = Number(project.estimated_cost) || Number(costRow.total_budgeted) || 0;
      const estimatedProfit = contractAmount - estimatedTotal;
      const percentComplete = estimatedTotal > 0 ? Math.round((costsToDate / estimatedTotal) * 10000) / 100 : 0;

      // Billing to date
      const [billingRow] = await trx('progress_billings')
        .where({ project_id: projectId })
        .whereIn('status', ['approved', 'invoiced'])
        .select(trx.raw('COALESCE(SUM(net_amount), 0) as billed_to_date')) as Record<string, unknown>[];
      const billedToDate = Number(billingRow.billed_to_date) || 0;

      // Earned revenue = contract * % complete
      const earnedRevenue = Math.round(contractAmount * (percentComplete / 100) * 100) / 100;
      const overUnderBilling = Math.round((earnedRevenue - billedToDate) * 100) / 100;

      results.push({
        project_id: projectId,
        project_name: String(project.name),
        status: String(project.status),
        contract_amount: contractAmount,
        costs_to_date: costsToDate,
        estimated_total_cost: estimatedTotal,
        estimated_profit: estimatedProfit,
        percent_complete: percentComplete,
        billed_to_date: billedToDate,
        earned_revenue: earnedRevenue,
        over_under_billing: overUnderBilling,
      });
    }

    return results;
  }

  async getUnitPriceSummary(trx: Knex.Transaction, projectId?: number) {
    const query = trx('unit_price_items as upi')
      .leftJoin('projects as p', 'p.id', 'upi.project_id')
      .select(
        'upi.*',
        'p.name as project_name',
      )
      .orderBy('p.name')
      .orderBy('upi.id');
    if (projectId) void query.where('upi.project_id', projectId);

    const rows = await query as Record<string, unknown>[];
    return rows.map((r) => {
      const contractQty = Number(r.contract_quantity) || 0;
      const completedQty = Number(r.quantity_completed) || 0;
      const unitPrice = Number(r.unit_price) || 0;
      return {
        id: Number(r.id),
        project_id: Number(r.project_id),
        project_name: String(r.project_name),
        description: String(r.description),
        unit: String(r.unit),
        contract_quantity: contractQty,
        quantity_completed: completedQty,
        unit_price: unitPrice,
        contract_amount: Math.round(contractQty * unitPrice * 100) / 100,
        earned_amount: Math.round(completedQty * unitPrice * 100) / 100,
        remaining_quantity: contractQty - completedQty,
        percent_complete: contractQty > 0 ? Math.round((completedQty / contractQty) * 10000) / 100 : 0,
      };
    });
  }
}
