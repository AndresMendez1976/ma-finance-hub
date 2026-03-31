// Time tracking service — CRUD, timer, approval, billing, summary
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class TimeTrackingService {
  async create(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    project_id: number; employee_id?: number; date?: string; start_time?: string;
    end_time?: string; duration_minutes?: number; description?: string;
    billable?: boolean; hourly_rate?: number;
  }) {
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    // Validate project exists
    const project = await trx('projects').where({ id: data.project_id }).first() as Record<string, unknown> | undefined;
    if (!project) throw new BadRequestException('Project not found');

    const billable = data.billable ?? true;
    const hourlyRate = data.hourly_rate ?? (Number(project.hourly_rate) || 0);
    const durationMinutes = data.duration_minutes ?? 0;
    const totalAmount = billable ? Math.round((durationMinutes / 60) * hourlyRate * 100) / 100 : 0;

    const [entry] = await trx('time_entries').insert({
      tenant_id: tenantId,
      project_id: data.project_id,
      employee_id: data.employee_id ?? user.id,
      date: data.date ?? new Date().toISOString().split('T')[0],
      start_time: data.start_time ?? null,
      end_time: data.end_time ?? null,
      duration_minutes: durationMinutes,
      description: data.description ?? null,
      billable,
      hourly_rate: hourlyRate,
      total_amount: totalAmount,
      status: 'draft',
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];
    return entry;
  }

  async findAll(trx: Knex.Transaction, filters: {
    project_id?: number; employee_id?: number; status?: string;
    from?: string; to?: string; billable?: boolean;
    page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('time_entries as te')
      .leftJoin('projects as p', 'p.id', 'te.project_id')
      .select('te.*', 'p.name as project_name', 'p.project_number')
      .orderBy('te.date', 'desc');
    if (filters.project_id) void query.where('te.project_id', filters.project_id);
    if (filters.employee_id) void query.where('te.employee_id', filters.employee_id);
    if (filters.status) void query.where('te.status', filters.status);
    if (filters.from) void query.where('te.date', '>=', filters.from);
    if (filters.to) void query.where('te.date', '<=', filters.to);
    if (filters.billable !== undefined) void query.where('te.billable', filters.billable);

    const countQuery = trx('time_entries');
    if (filters.project_id) void countQuery.where('project_id', filters.project_id);
    if (filters.employee_id) void countQuery.where('employee_id', filters.employee_id);
    if (filters.status) void countQuery.where('status', filters.status);
    if (filters.from) void countQuery.where('date', '>=', filters.from);
    if (filters.to) void countQuery.where('date', '<=', filters.to);
    if (filters.billable !== undefined) void countQuery.where('billable', filters.billable);
    const [countResult] = await countQuery.count('* as total') as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async findOne(trx: Knex.Transaction, id: number) {
    const entry = await trx('time_entries as te')
      .leftJoin('projects as p', 'p.id', 'te.project_id')
      .select('te.*', 'p.name as project_name', 'p.project_number')
      .where('te.id', id)
      .first() as Record<string, unknown> | undefined;
    return entry ?? null;
  }

  async update(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const entry = await trx('time_entries').where({ id }).first() as Record<string, unknown> | undefined;
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.status !== 'draft') throw new BadRequestException('Only draft time entries can be edited');

    const updates: Record<string, unknown> = {};
    for (const key of ['project_id', 'employee_id', 'date', 'start_time', 'end_time', 'duration_minutes', 'description', 'billable', 'hourly_rate']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }

    // Recalculate total_amount if duration or rate changed
    const durationMinutes = Number(updates.duration_minutes ?? entry.duration_minutes);
    const hourlyRate = Number(updates.hourly_rate ?? entry.hourly_rate);
    const billable = updates.billable !== undefined ? Boolean(updates.billable) : Boolean(entry.billable);
    updates.total_amount = billable ? Math.round((durationMinutes / 60) * hourlyRate * 100) / 100 : 0;

    if (Object.keys(updates).length > 0) {
      await trx('time_entries').where({ id }).update(updates);
    }
    return this.findOne(trx, id);
  }

  async delete(trx: Knex.Transaction, id: number) {
    const entry = await trx('time_entries').where({ id }).first() as Record<string, unknown> | undefined;
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.status !== 'draft') throw new BadRequestException('Only draft time entries can be deleted');
    await trx('time_entries').where({ id }).del();
    return { deleted: true };
  }

  // Start a timer — creates an entry with start_time=now
  async startTimer(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    project_id: number; description?: string; billable?: boolean; hourly_rate?: number;
  }) {
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    const project = await trx('projects').where({ id: data.project_id }).first() as Record<string, unknown> | undefined;
    if (!project) throw new BadRequestException('Project not found');

    const billable = data.billable ?? true;
    const hourlyRate = data.hourly_rate ?? (Number(project.hourly_rate) || 0);
    const now = new Date();

    const [entry] = await trx('time_entries').insert({
      tenant_id: tenantId,
      project_id: data.project_id,
      employee_id: user.id,
      date: now.toISOString().split('T')[0],
      start_time: now.toISOString(),
      end_time: null,
      duration_minutes: 0,
      description: data.description ?? null,
      billable,
      hourly_rate: hourlyRate,
      total_amount: 0,
      status: 'draft',
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];
    return entry;
  }

  // Stop a running timer — set end_time, calculate duration
  async stopTimer(trx: Knex.Transaction, id: number) {
    const entry = await trx('time_entries').where({ id }).first() as Record<string, unknown> | undefined;
    if (!entry) throw new NotFoundException('Time entry not found');
    if (!entry.start_time) throw new BadRequestException('Time entry has no start time');
    if (entry.end_time) throw new BadRequestException('Timer is already stopped');

    const startTime = new Date(String(entry.start_time));
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    const billable = Boolean(entry.billable);
    const hourlyRate = Number(entry.hourly_rate);
    const totalAmount = billable ? Math.round((durationMinutes / 60) * hourlyRate * 100) / 100 : 0;

    const [updated] = await trx('time_entries').where({ id }).update({
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      total_amount: totalAmount,
    }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Approve a time entry
  async approve(trx: Knex.Transaction, id: number, approverSubject: string) {
    const entry = await trx('time_entries').where({ id }).first() as Record<string, unknown> | undefined;
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.status !== 'draft') throw new BadRequestException(`Cannot approve time entry with status '${String(entry.status)}'`);

    const user = await trx('users').where({ external_subject: approverSubject }).select('id').first() as Record<string, unknown> | undefined;
    const [updated] = await trx('time_entries').where({ id }).update({
      status: 'approved',
      approved_by: user?.id ?? null,
    }).returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Bill time entries — create invoice, mark entries as billed
  async billTimeEntries(trx: Knex.Transaction, tenantId: number, createdBy: string, body: {
    time_entry_ids: number[]; contact_id: number;
  }) {
    if (!body.time_entry_ids || body.time_entry_ids.length === 0) {
      throw new BadRequestException('No time entries selected');
    }

    // Get selected time entries
    const entries = await trx('time_entries')
      .whereIn('id', body.time_entry_ids)
      .where({ tenant_id: tenantId, billable: true })
      .whereIn('status', ['approved'])
      .select('*') as Record<string, unknown>[];

    if (entries.length === 0) {
      throw new BadRequestException('No approved billable time entries found');
    }

    // Get contact for invoice
    const contact = await trx('contacts').where({ id: body.contact_id }).first() as Record<string, unknown> | undefined;
    if (!contact) throw new BadRequestException('Contact not found');

    // Resolve user
    const user = await trx('users').where({ external_subject: createdBy }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    // Generate invoice number
    const lastInvoice = await trx('invoices')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('invoice_number')
      .first() as Record<string, unknown> | undefined;
    let invoiceNum = 1;
    if (lastInvoice) {
      invoiceNum = parseInt(String(lastInvoice.invoice_number).replace('INV-', ''), 10) + 1;
    }
    const invoiceNumber = `INV-${String(invoiceNum).padStart(4, '0')}`;

    // Build invoice lines from time entries
    const lineAmounts = entries.map((e) => {
      const hours = Math.round((Number(e.duration_minutes) / 60) * 100) / 100;
      const rate = Number(e.hourly_rate);
      const amount = Number(e.total_amount);
      return {
        description: `${String(e.description || 'Time entry')} (${hours}h @ ${rate}/hr)`,
        quantity: hours,
        unit_price: rate,
        amount,
      };
    });

    const subtotal = lineAmounts.reduce((s, l) => s + l.amount, 0);
    const total = Math.round(subtotal * 100) / 100;
    const today = new Date().toISOString().split('T')[0];

    // Create invoice
    const [invoice] = await trx('invoices').insert({
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      customer_name: String(contact.name),
      customer_email: contact.email ?? null,
      issue_date: today,
      due_date: today, // Can be updated later
      status: 'draft',
      subtotal,
      tax_rate: 0,
      tax_amount: 0,
      total,
      notes: `Generated from ${entries.length} time entries`,
      created_by: user.id,
    }).returning('*') as Record<string, unknown>[];

    // Insert invoice lines
    const lineRows = lineAmounts.map((l, i) => ({
      invoice_id: invoice.id,
      tenant_id: tenantId,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      amount: l.amount,
      sort_order: i,
    }));
    await trx('invoice_lines').insert(lineRows);

    // Mark time entries as billed
    await trx('time_entries')
      .whereIn('id', body.time_entry_ids)
      .update({ status: 'billed', invoice_id: invoice.id });

    // Update project actual_revenue for each affected project
    const projectIds = [...new Set(entries.map((e) => Number(e.project_id)))];
    for (const projectId of projectIds) {
      const [revenueResult] = await trx('time_entries')
        .where({ project_id: projectId })
        .whereIn('status', ['approved', 'billed'])
        .where('billable', true)
        .sum('total_amount as total') as Record<string, unknown>[];
      await trx('projects').where({ id: projectId }).update({
        actual_revenue: Number(revenueResult.total) || 0,
      });
    }

    const lines = await trx('invoice_lines').where({ invoice_id: invoice.id }).orderBy('sort_order').select('*') as Record<string, unknown>[];
    return { ...invoice, lines } as Record<string, unknown> & { lines: Record<string, unknown>[] };
  }

  // Time summary — hours grouped by project/employee/period
  async getTimeSummary(trx: Knex.Transaction, filters: {
    from?: string; to?: string; project_id?: number; employee_id?: number; group_by?: string;
  }) {
    const groupBy = filters.group_by ?? 'project';

    let groupColumn: string;
    let nameJoin: string | null = null;
    let nameSelect: string | null = null;
    switch (groupBy) {
      case 'employee':
        groupColumn = 'te.employee_id';
        nameJoin = 'users';
        nameSelect = 'u.email as group_name';
        break;
      case 'date':
        groupColumn = 'te.date';
        nameSelect = 'te.date as group_name';
        break;
      default: // project
        groupColumn = 'te.project_id';
        nameJoin = 'projects';
        nameSelect = 'p.name as group_name';
        break;
    }

    const query = trx('time_entries as te')
      .select(trx.raw(`${groupColumn} as group_id`))
      .sum('te.duration_minutes as total_minutes')
      .sum('te.total_amount as total_amount')
      .count('* as entry_count')
      .groupBy(groupColumn);

    if (nameJoin === 'projects') {
      void query.leftJoin('projects as p', 'p.id', 'te.project_id').select(trx.raw(nameSelect));
    } else if (nameJoin === 'users') {
      void query.leftJoin('users as u', 'u.id', 'te.employee_id').select(trx.raw(nameSelect));
    } else if (nameSelect) {
      void query.select(trx.raw(nameSelect));
    }

    if (filters.from) void query.where('te.date', '>=', filters.from);
    if (filters.to) void query.where('te.date', '<=', filters.to);
    if (filters.project_id) void query.where('te.project_id', filters.project_id);
    if (filters.employee_id) void query.where('te.employee_id', filters.employee_id);

    const rows = await query as Record<string, unknown>[];
    return rows.map((r) => ({
      group_id: r.group_id,
      group_name: r.group_name ?? null,
      total_minutes: Number(r.total_minutes) || 0,
      total_hours: Math.round((Number(r.total_minutes) || 0) / 60 * 100) / 100,
      total_amount: Number(r.total_amount) || 0,
      entry_count: Number(r.entry_count),
    }));
  }
}
