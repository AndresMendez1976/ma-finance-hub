// Equipment service — CRUD equipment, usage tracking, utilization, cost reports
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class EquipmentService {
  // Generate next equipment number
  private async nextEquipmentNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('equipment')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('equipment_number')
      .first() as Record<string, unknown> | undefined;
    if (!last) return 'EQ-001';
    const num = parseInt(String(last.equipment_number).replace('EQ-', ''), 10);
    return `EQ-${String(num + 1).padStart(3, '0')}`;
  }

  // ─── Equipment CRUD ────────────────────────────────────────────────────────

  async create(trx: Knex.Transaction, tenantId: number, data: {
    name: string; description?: string; category?: string; make?: string;
    model?: string; serial_number?: string; purchase_date?: string;
    purchase_cost?: number; hourly_rate?: number;
  }) {
    const equipmentNumber = await this.nextEquipmentNumber(trx, tenantId);
    const [row] = await trx('equipment').insert({
      tenant_id: tenantId,
      equipment_number: equipmentNumber,
      name: data.name,
      description: data.description ?? null,
      category: data.category ?? null,
      make: data.make ?? null,
      model: data.model ?? null,
      serial_number: data.serial_number ?? null,
      purchase_date: data.purchase_date ?? null,
      purchase_cost: data.purchase_cost ?? null,
      hourly_rate: data.hourly_rate !== undefined ? data.hourly_rate : 0,
      status: 'active',
    }).returning('*') as Record<string, unknown>[];
    return row;
  }

  async findAll(trx: Knex.Transaction, filters: {
    status?: string; category?: string; page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('equipment').select('*').orderBy('equipment_number');
    if (filters.status) void query.where('status', filters.status);
    if (filters.category) void query.where('category', filters.category);

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOne(trx: Knex.Transaction, id: number) {
    const row = await trx('equipment').where({ id }).first() as Record<string, unknown> | undefined;
    return row ?? null;
  }

  async update(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const existing = await trx('equipment').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Equipment not found');
    const updates: Record<string, unknown> = {};
    for (const key of ['name', 'description', 'category', 'make', 'model', 'serial_number', 'purchase_date', 'purchase_cost', 'hourly_rate', 'status']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('equipment').where({ id }).update(updates);
    }
    return this.findOne(trx, id);
  }

  async remove(trx: Knex.Transaction, id: number) {
    const existing = await trx('equipment').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Equipment not found');
    const [updated] = await trx('equipment').where({ id }).update({ status: 'inactive' }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  // ─── Equipment Usage CRUD ──────────────────────────────────────────────────

  async createUsage(trx: Knex.Transaction, tenantId: number, data: {
    equipment_id: number; project_id?: number; date: string;
    hours: number; rate_override?: number; operator?: string; notes?: string;
  }) {
    const equipment = await trx('equipment').where({ id: data.equipment_id }).first() as Record<string, unknown> | undefined;
    if (!equipment) throw new BadRequestException('Equipment not found');

    const rate = data.rate_override ?? Number(equipment.hourly_rate ?? 0);
    const cost = Math.round(data.hours * rate * 100) / 100;

    const [row] = await trx('equipment_usage').insert({
      tenant_id: tenantId,
      equipment_id: data.equipment_id,
      project_id: data.project_id ?? null,
      date: data.date,
      hours: data.hours,
      rate: rate,
      cost: cost,
      operator: data.operator ?? null,
      notes: data.notes ?? null,
    }).returning('*') as Record<string, unknown>[];
    return row;
  }

  async findAllUsage(trx: Knex.Transaction, filters: {
    equipment_id?: number; project_id?: number; from?: string; to?: string;
    page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('equipment_usage as eu')
      .leftJoin('equipment as e', 'e.id', 'eu.equipment_id')
      .leftJoin('projects as p', 'p.id', 'eu.project_id')
      .select('eu.*', 'e.name as equipment_name', 'e.equipment_number', 'p.name as project_name')
      .orderBy('eu.date', 'desc');
    if (filters.equipment_id) void query.where('eu.equipment_id', filters.equipment_id);
    if (filters.project_id) void query.where('eu.project_id', filters.project_id);
    if (filters.from) void query.where('eu.date', '>=', filters.from);
    if (filters.to) void query.where('eu.date', '<=', filters.to);

    const countQuery = trx('equipment_usage');
    if (filters.equipment_id) void countQuery.where('equipment_id', filters.equipment_id);
    if (filters.project_id) void countQuery.where('project_id', filters.project_id);
    if (filters.from) void countQuery.where('date', '>=', filters.from);
    if (filters.to) void countQuery.where('date', '<=', filters.to);
    const [countResult] = await countQuery.count('* as total') as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOneUsage(trx: Knex.Transaction, id: number) {
    const row = await trx('equipment_usage as eu')
      .leftJoin('equipment as e', 'e.id', 'eu.equipment_id')
      .leftJoin('projects as p', 'p.id', 'eu.project_id')
      .select('eu.*', 'e.name as equipment_name', 'e.equipment_number', 'p.name as project_name')
      .where('eu.id', id)
      .first() as Record<string, unknown> | undefined;
    return row ?? null;
  }

  async updateUsage(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const existing = await trx('equipment_usage').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Equipment usage not found');
    const updates: Record<string, unknown> = {};
    for (const key of ['equipment_id', 'project_id', 'date', 'hours', 'rate', 'cost', 'operator', 'notes']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('equipment_usage').where({ id }).update(updates);
    }
    return this.findOneUsage(trx, id);
  }

  async deleteUsage(trx: Knex.Transaction, id: number) {
    const existing = await trx('equipment_usage').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Equipment usage not found');
    await trx('equipment_usage').where({ id }).del();
    return { deleted: true };
  }

  // ─── Utilization ───────────────────────────────────────────────────────────

  async getUtilization(trx: Knex.Transaction, equipmentId: number, from?: string, to?: string) {
    const equipment = await trx('equipment').where({ id: equipmentId }).first() as Record<string, unknown> | undefined;
    if (!equipment) throw new NotFoundException('Equipment not found');

    const query = trx('equipment_usage').where({ equipment_id: equipmentId });
    if (from) void query.where('date', '>=', from);
    if (to) void query.where('date', '<=', to);

    const [result] = await query.clone()
      .select(
        trx.raw('COALESCE(SUM(hours), 0) as total_hours'),
        trx.raw('COALESCE(SUM(cost), 0) as total_cost'),
        trx.raw('COUNT(DISTINCT date) as days_used'),
      ) as Record<string, unknown>[];

    // Calculate date range for utilization rate
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : new Date();
    const dateRange = fromDate
      ? Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
      : 365;
    const availableHours = dateRange * 8; // Assume 8 hours/day
    const totalHours = Number(result.total_hours) || 0;
    const utilizationRate = availableHours > 0 ? Math.round((totalHours / availableHours) * 10000) / 100 : 0;

    return {
      equipment_id: equipmentId,
      equipment_name: String(equipment.name),
      equipment_number: String(equipment.equipment_number),
      total_hours: totalHours,
      total_cost: Number(result.total_cost) || 0,
      days_used: Number(result.days_used) || 0,
      available_hours: availableHours,
      utilization_rate: utilizationRate,
    };
  }

  // ─── Equipment Cost Report ─────────────────────────────────────────────────

  async getEquipmentCostReport(trx: Knex.Transaction) {
    const rows = await trx('equipment_usage as eu')
      .leftJoin('equipment as e', 'e.id', 'eu.equipment_id')
      .leftJoin('projects as p', 'p.id', 'eu.project_id')
      .groupBy('e.id', 'e.name', 'e.equipment_number', 'p.id', 'p.name')
      .select(
        'e.id as equipment_id',
        'e.name as equipment_name',
        'e.equipment_number',
        'p.id as project_id',
        'p.name as project_name',
        trx.raw('COALESCE(SUM(eu.hours), 0) as total_hours'),
        trx.raw('COALESCE(SUM(eu.cost), 0) as total_cost'),
      )
      .orderBy('e.name')
      .orderBy('p.name') as Record<string, unknown>[];

    return rows.map((r) => ({
      equipment_id: Number(r.equipment_id),
      equipment_name: String(r.equipment_name),
      equipment_number: String(r.equipment_number),
      project_id: r.project_id ? Number(r.project_id) : null,
      project_name: r.project_name ? String(r.project_name) : 'Unassigned',
      total_hours: Number(r.total_hours) || 0,
      total_cost: Number(r.total_cost) || 0,
    }));
  }
}
