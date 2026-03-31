// Maintenance service — CRUD maintenance records, schedules, upcoming/overdue tracking
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class MaintenanceService {
  // Create a new maintenance record
  async create(trx: Knex.Transaction, tenantId: number, data: Record<string, unknown>) {
    // Verify asset exists
    const asset = await trx('fixed_assets').where({ id: data.fixed_asset_id }).first() as Record<string, unknown> | undefined;
    if (!asset) throw new BadRequestException('Fixed asset not found');

    const [record] = await trx('maintenance_records')
      .insert({
        tenant_id: tenantId,
        fixed_asset_id: data.fixed_asset_id,
        maintenance_type: data.maintenance_type,
        title: data.title,
        description: data.description ?? null,
        scheduled_date: data.scheduled_date,
        cost: data.cost ?? null,
        vendor_contact_id: data.vendor_contact_id ?? null,
        assigned_to: data.assigned_to ?? null,
        notes: data.notes ?? null,
        status: 'scheduled',
      })
      .returning('*') as Record<string, unknown>[];

    return record;
  }

  // List maintenance records with optional filters
  async findAll(
    trx: Knex.Transaction,
    filters: { fixed_asset_id?: number; status?: string; maintenance_type?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('maintenance_records')
      .select('maintenance_records.*')
      .leftJoin('fixed_assets', 'maintenance_records.fixed_asset_id', 'fixed_assets.id')
      .orderBy('maintenance_records.scheduled_date', 'desc');

    if (filters.fixed_asset_id) void query.where('maintenance_records.fixed_asset_id', filters.fixed_asset_id);
    if (filters.status) void query.where('maintenance_records.status', filters.status);
    if (filters.maintenance_type) void query.where('maintenance_records.maintenance_type', filters.maintenance_type);

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

  // Get single maintenance record
  async findOne(trx: Knex.Transaction, id: number) {
    const record = await trx('maintenance_records').where({ id }).first() as Record<string, unknown> | undefined;
    return record ?? null;
  }

  // Update maintenance record
  async update(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const record = await trx('maintenance_records').where({ id }).first() as Record<string, unknown> | undefined;
    if (!record) throw new NotFoundException('Maintenance record not found');

    const updates: Record<string, unknown> = {};
    const allowedFields = [
      'maintenance_type', 'title', 'description', 'scheduled_date', 'completed_date',
      'cost', 'vendor_contact_id', 'assigned_to', 'notes', 'status',
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    if (Object.keys(updates).length > 0) {
      await trx('maintenance_records').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Get upcoming maintenance (due within next N days)
  async getUpcoming(trx: Knex.Transaction, days = 30) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const records = await trx('maintenance_records')
      .where('status', 'scheduled')
      .where('scheduled_date', '>=', now.toISOString().slice(0, 10))
      .where('scheduled_date', '<=', futureDate.toISOString().slice(0, 10))
      .leftJoin('fixed_assets', 'maintenance_records.fixed_asset_id', 'fixed_assets.id')
      .select(
        'maintenance_records.*',
        'fixed_assets.name as asset_name',
        'fixed_assets.asset_number',
      )
      .orderBy('maintenance_records.scheduled_date', 'asc') as Record<string, unknown>[];

    return records;
  }

  // Get overdue maintenance (past due and not completed)
  async getOverdue(trx: Knex.Transaction) {
    const now = new Date().toISOString().slice(0, 10);

    const records = await trx('maintenance_records')
      .where('status', 'scheduled')
      .where('scheduled_date', '<', now)
      .leftJoin('fixed_assets', 'maintenance_records.fixed_asset_id', 'fixed_assets.id')
      .select(
        'maintenance_records.*',
        'fixed_assets.name as asset_name',
        'fixed_assets.asset_number',
      )
      .orderBy('maintenance_records.scheduled_date', 'asc') as Record<string, unknown>[];

    return records;
  }

  // Create a maintenance schedule
  async createSchedule(trx: Knex.Transaction, tenantId: number, data: Record<string, unknown>) {
    // Verify asset exists
    const asset = await trx('fixed_assets').where({ id: data.fixed_asset_id }).first() as Record<string, unknown> | undefined;
    if (!asset) throw new BadRequestException('Fixed asset not found');

    const [schedule] = await trx('maintenance_schedules')
      .insert({
        tenant_id: tenantId,
        fixed_asset_id: data.fixed_asset_id,
        title: data.title,
        description: data.description ?? null,
        frequency: data.frequency,
        next_due_date: data.next_due_date,
        is_active: true,
      })
      .returning('*') as Record<string, unknown>[];

    return schedule;
  }

  // List maintenance schedules
  async findAllSchedules(
    trx: Knex.Transaction,
    filters: { fixed_asset_id?: number; is_active?: boolean; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('maintenance_schedules')
      .select('maintenance_schedules.*')
      .leftJoin('fixed_assets', 'maintenance_schedules.fixed_asset_id', 'fixed_assets.id')
      .orderBy('maintenance_schedules.next_due_date', 'asc');

    if (filters.fixed_asset_id) void query.where('maintenance_schedules.fixed_asset_id', filters.fixed_asset_id);
    if (filters.is_active !== undefined) void query.where('maintenance_schedules.is_active', filters.is_active);

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

  // Get single maintenance schedule
  async findOneSchedule(trx: Knex.Transaction, id: number) {
    const schedule = await trx('maintenance_schedules').where({ id }).first() as Record<string, unknown> | undefined;
    return schedule ?? null;
  }

  // Update maintenance schedule
  async updateSchedule(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const schedule = await trx('maintenance_schedules').where({ id }).first() as Record<string, unknown> | undefined;
    if (!schedule) throw new NotFoundException('Maintenance schedule not found');

    const updates: Record<string, unknown> = {};
    const allowedFields = ['title', 'description', 'frequency', 'next_due_date', 'is_active'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    if (Object.keys(updates).length > 0) {
      await trx('maintenance_schedules').where({ id }).update(updates);
    }

    return this.findOneSchedule(trx, id);
  }

  // Generate a maintenance record from a schedule and advance the next_due_date
  async generateFromSchedule(trx: Knex.Transaction, tenantId: number, scheduleId: number) {
    const schedule = await trx('maintenance_schedules').where({ id: scheduleId }).first() as Record<string, unknown> | undefined;
    if (!schedule) throw new NotFoundException('Maintenance schedule not found');
    if (!schedule.is_active) throw new BadRequestException('Schedule is not active');

    // Create maintenance record
    const [record] = await trx('maintenance_records')
      .insert({
        tenant_id: tenantId,
        fixed_asset_id: schedule.fixed_asset_id,
        maintenance_type: 'preventive',
        title: schedule.title,
        description: schedule.description ?? null,
        scheduled_date: schedule.next_due_date,
        status: 'scheduled',
      })
      .returning('*') as Record<string, unknown>[];

    // Advance next_due_date based on frequency
    const currentDate = new Date(String(schedule.next_due_date));
    const frequency = String(schedule.frequency);

    switch (frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 'semi_annual':
        currentDate.setMonth(currentDate.getMonth() + 6);
        break;
      case 'annual':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }

    await trx('maintenance_schedules')
      .where({ id: scheduleId })
      .update({ next_due_date: currentDate.toISOString().slice(0, 10) });

    return record;
  }
}
