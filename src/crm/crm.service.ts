// CRM service — pipelines, stages, opportunities, activities, dashboard
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class CrmService {
  // ─── Pipelines ───

  // Create a pipeline with stages
  async createPipeline(trx: Knex.Transaction, tenantId: number, data: {
    name: string; description?: string;
    stages: { name: string; sort_order: number; probability?: number }[];
  }) {
    const [pipeline] = await trx('crm_pipelines').insert({
      tenant_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      is_active: true,
    }).returning('*') as Record<string, unknown>[];

    if (data.stages && data.stages.length > 0) {
      const stageRows = data.stages.map((s) => ({
        pipeline_id: pipeline.id,
        tenant_id: tenantId,
        name: s.name,
        sort_order: s.sort_order,
        probability: s.probability ?? 0,
      }));
      await trx('crm_pipeline_stages').insert(stageRows);
    }

    return this.findOnePipeline(trx, Number(pipeline.id));
  }

  // List pipelines
  async findAllPipelines(trx: Knex.Transaction) {
    const pipelines = await trx('crm_pipelines')
      .select('*')
      .orderBy('name', 'asc') as Record<string, unknown>[];

    const pipelineIds = pipelines.map((p) => Number(p.id));
    const stages = pipelineIds.length > 0
      ? await trx('crm_pipeline_stages').whereIn('pipeline_id', pipelineIds).orderBy('sort_order', 'asc') as Record<string, unknown>[]
      : [];

    return pipelines.map((p) => ({
      ...p,
      stages: stages.filter((s) => s.pipeline_id === p.id),
    }));
  }

  // Get single pipeline with stages
  async findOnePipeline(trx: Knex.Transaction, id: number) {
    const pipeline = await trx('crm_pipelines').where({ id }).first() as Record<string, unknown> | undefined;
    if (!pipeline) return null;

    const stages = await trx('crm_pipeline_stages')
      .where({ pipeline_id: id })
      .orderBy('sort_order', 'asc') as Record<string, unknown>[];

    return { ...pipeline, stages };
  }

  // Update pipeline
  async updatePipeline(trx: Knex.Transaction, id: number, tenantId: number, data: {
    name?: string; description?: string; is_active?: boolean;
    stages?: { name: string; sort_order: number; probability?: number }[];
  }) {
    const existing = await trx('crm_pipelines').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Pipeline not found');

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.is_active !== undefined) updates.is_active = data.is_active;

    if (Object.keys(updates).length > 0) {
      await trx('crm_pipelines').where({ id }).update(updates);
    }

    if (data.stages !== undefined) {
      await trx('crm_pipeline_stages').where({ pipeline_id: id }).delete();
      if (data.stages.length > 0) {
        const stageRows = data.stages.map((s) => ({
          pipeline_id: id,
          tenant_id: tenantId,
          name: s.name,
          sort_order: s.sort_order,
          probability: s.probability ?? 0,
        }));
        await trx('crm_pipeline_stages').insert(stageRows);
      }
    }

    return this.findOnePipeline(trx, id);
  }

  // Delete pipeline
  async deletePipeline(trx: Knex.Transaction, id: number) {
    const existing = await trx('crm_pipelines').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Pipeline not found');

    await trx('crm_pipeline_stages').where({ pipeline_id: id }).delete();
    await trx('crm_pipelines').where({ id }).delete();
    return { deleted: true, id };
  }

  // ─── Opportunities ───

  // Create opportunity
  async createOpportunity(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    name: string; pipeline_id: number; stage_id: number; contact_id?: number;
    value: number; probability?: number; expected_close_date?: string; notes?: string;
    assigned_to?: string;
  }) {
    const stage = await trx('crm_pipeline_stages').where({ id: data.stage_id }).first() as Record<string, unknown> | undefined;
    if (!stage) throw new BadRequestException('Stage not found');

    const probability = data.probability ?? Number(stage.probability ?? 0);
    const weightedValue = Math.round(data.value * probability / 100 * 100) / 100;

    const [opp] = await trx('crm_opportunities').insert({
      tenant_id: tenantId,
      name: data.name,
      pipeline_id: data.pipeline_id,
      stage_id: data.stage_id,
      contact_id: data.contact_id ?? null,
      value: data.value,
      probability,
      weighted_value: weightedValue,
      expected_close_date: data.expected_close_date ?? null,
      notes: data.notes ?? null,
      assigned_to: data.assigned_to ?? null,
      status: 'open',
      created_by: createdBy,
    }).returning('*') as Record<string, unknown>[];

    return opp;
  }

  // List opportunities
  async findAllOpportunities(trx: Knex.Transaction, filters?: {
    pipeline_id?: number; stage_id?: number; status?: string;
    contact_id?: number; page?: number; limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('crm_opportunities')
      .leftJoin('contacts', 'crm_opportunities.contact_id', 'contacts.id')
      .leftJoin('crm_pipeline_stages', 'crm_opportunities.stage_id', 'crm_pipeline_stages.id')
      .select(
        'crm_opportunities.*',
        'contacts.first_name as contact_first_name',
        'contacts.last_name as contact_last_name',
        'contacts.company_name as contact_company',
        'crm_pipeline_stages.name as stage_name',
      )
      .orderBy('crm_opportunities.created_at', 'desc');

    if (filters?.pipeline_id) void query.where('crm_opportunities.pipeline_id', filters.pipeline_id);
    if (filters?.stage_id) void query.where('crm_opportunities.stage_id', filters.stage_id);
    if (filters?.status) void query.where('crm_opportunities.status', filters.status);
    if (filters?.contact_id) void query.where('crm_opportunities.contact_id', filters.contact_id);

    const countQuery = query.clone().clearSelect().clearOrder().count('crm_opportunities.id as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];

    return {
      data: rows,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    };
  }

  // Get single opportunity
  async findOneOpportunity(trx: Knex.Transaction, id: number) {
    const opp = await trx('crm_opportunities')
      .leftJoin('contacts', 'crm_opportunities.contact_id', 'contacts.id')
      .leftJoin('crm_pipeline_stages', 'crm_opportunities.stage_id', 'crm_pipeline_stages.id')
      .leftJoin('crm_pipelines', 'crm_opportunities.pipeline_id', 'crm_pipelines.id')
      .select(
        'crm_opportunities.*',
        'contacts.first_name as contact_first_name',
        'contacts.last_name as contact_last_name',
        'contacts.company_name as contact_company',
        'crm_pipeline_stages.name as stage_name',
        'crm_pipelines.name as pipeline_name',
      )
      .where('crm_opportunities.id', id)
      .first() as Record<string, unknown> | undefined;

    if (!opp) return null;

    // Get activities for this opportunity
    const activities = await trx('crm_activities')
      .where({ opportunity_id: id })
      .orderBy('activity_date', 'desc') as Record<string, unknown>[];

    return { ...opp, activities };
  }

  // Update opportunity
  async updateOpportunity(trx: Knex.Transaction, id: number, data: {
    name?: string; pipeline_id?: number; stage_id?: number; contact_id?: number;
    value?: number; probability?: number; expected_close_date?: string; notes?: string;
    assigned_to?: string;
  }) {
    const existing = await trx('crm_opportunities').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Opportunity not found');

    const updates: Record<string, unknown> = {};
    const fields = ['name', 'pipeline_id', 'stage_id', 'contact_id', 'value', 'probability', 'expected_close_date', 'notes', 'assigned_to'] as const;
    for (const field of fields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        updates[field] = (data as Record<string, unknown>)[field];
      }
    }

    // Recalculate weighted value if value or probability changed
    const value = Number(updates.value ?? existing.value);
    const probability = Number(updates.probability ?? existing.probability);
    updates.weighted_value = Math.round(value * probability / 100 * 100) / 100;

    if (Object.keys(updates).length > 0) {
      await trx('crm_opportunities').where({ id }).update(updates);
    }

    return trx('crm_opportunities').where({ id }).first() as Promise<Record<string, unknown>>;
  }

  // Delete opportunity
  async deleteOpportunity(trx: Knex.Transaction, id: number) {
    const existing = await trx('crm_opportunities').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Opportunity not found');

    await trx('crm_activities').where({ opportunity_id: id }).delete();
    await trx('crm_opportunities').where({ id }).delete();
    return { deleted: true, id };
  }

  // Move opportunity to a different stage
  async moveOpportunity(trx: Knex.Transaction, id: number, stageId: number) {
    const opp = await trx('crm_opportunities').where({ id }).first() as Record<string, unknown> | undefined;
    if (!opp) throw new NotFoundException('Opportunity not found');

    const stage = await trx('crm_pipeline_stages').where({ id: stageId }).first() as Record<string, unknown> | undefined;
    if (!stage) throw new BadRequestException('Stage not found');

    const probability = Number(stage.probability ?? 0);
    const value = Number(opp.value);
    const weightedValue = Math.round(value * probability / 100 * 100) / 100;

    await trx('crm_opportunities').where({ id }).update({
      stage_id: stageId,
      probability,
      weighted_value: weightedValue,
    });

    return trx('crm_opportunities').where({ id }).first() as Promise<Record<string, unknown>>;
  }

  // Win an opportunity
  async winOpportunity(trx: Knex.Transaction, id: number, tenantId: number, createInvoice: boolean) {
    const opp = await trx('crm_opportunities').where({ id }).first() as Record<string, unknown> | undefined;
    if (!opp) throw new NotFoundException('Opportunity not found');
    if (opp.status !== 'open') throw new BadRequestException('Only open opportunities can be won');

    const now = new Date().toISOString().slice(0, 10);

    await trx('crm_opportunities').where({ id }).update({
      status: 'won',
      probability: 100,
      weighted_value: opp.value,
      actual_close_date: now,
    });

    let invoice: Record<string, unknown> | null = null;

    if (createInvoice && opp.contact_id) {
      // Generate invoice number
      const last = await trx('invoices')
        .where({ tenant_id: tenantId })
        .orderBy('id', 'desc')
        .select('invoice_number')
        .first() as Record<string, unknown> | undefined;

      const nextNum = last
        ? parseInt(String(last.invoice_number).replace('INV-', ''), 10) + 1
        : 1;
      const invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`;

      const [inv] = await trx('invoices').insert({
        tenant_id: tenantId,
        contact_id: opp.contact_id,
        invoice_number: invoiceNumber,
        invoice_date: now,
        due_date: now, // Can be updated later
        status: 'draft',
        subtotal: opp.value,
        tax: 0,
        total: opp.value,
        paid_amount: 0,
        notes: `Auto-created from CRM opportunity: ${String(opp.name)}`,
      }).returning('*') as Record<string, unknown>[];

      // Create a single invoice line
      await trx('invoice_lines').insert({
        invoice_id: inv.id,
        tenant_id: tenantId,
        description: String(opp.name),
        quantity: 1,
        unit_price: opp.value,
        amount: opp.value,
      });

      invoice = inv;
    }

    const updated = await trx('crm_opportunities').where({ id }).first() as Record<string, unknown>;
    return { opportunity: updated, invoice };
  }

  // Lose an opportunity
  async loseOpportunity(trx: Knex.Transaction, id: number, reason?: string) {
    const opp = await trx('crm_opportunities').where({ id }).first() as Record<string, unknown> | undefined;
    if (!opp) throw new NotFoundException('Opportunity not found');
    if (opp.status !== 'open') throw new BadRequestException('Only open opportunities can be lost');

    const now = new Date().toISOString().slice(0, 10);

    await trx('crm_opportunities').where({ id }).update({
      status: 'lost',
      probability: 0,
      weighted_value: 0,
      actual_close_date: now,
      loss_reason: reason ?? null,
    });

    return trx('crm_opportunities').where({ id }).first() as Promise<Record<string, unknown>>;
  }

  // ─── Activities ───

  // Create activity
  async createActivity(trx: Knex.Transaction, tenantId: number, createdBy: string, data: {
    opportunity_id?: number; contact_id?: number; type: string;
    subject: string; description?: string; activity_date: string;
    duration_minutes?: number; status?: string;
  }) {
    const [activity] = await trx('crm_activities').insert({
      tenant_id: tenantId,
      opportunity_id: data.opportunity_id ?? null,
      contact_id: data.contact_id ?? null,
      type: data.type,
      subject: data.subject,
      description: data.description ?? null,
      activity_date: data.activity_date,
      duration_minutes: data.duration_minutes ?? null,
      status: data.status ?? 'planned',
      created_by: createdBy,
    }).returning('*') as Record<string, unknown>[];

    return activity;
  }

  // List activities
  async findAllActivities(trx: Knex.Transaction, filters?: {
    opportunity_id?: number; contact_id?: number; type?: string; status?: string;
    page?: number; limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('crm_activities').select('*').orderBy('activity_date', 'desc');
    if (filters?.opportunity_id) void query.where('opportunity_id', filters.opportunity_id);
    if (filters?.contact_id) void query.where('contact_id', filters.contact_id);
    if (filters?.type) void query.where('type', filters.type);
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

  // Update activity
  async updateActivity(trx: Knex.Transaction, id: number, data: {
    type?: string; subject?: string; description?: string;
    activity_date?: string; duration_minutes?: number; status?: string;
  }) {
    const existing = await trx('crm_activities').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Activity not found');

    const updates: Record<string, unknown> = {};
    const fields = ['type', 'subject', 'description', 'activity_date', 'duration_minutes', 'status'] as const;
    for (const field of fields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        updates[field] = (data as Record<string, unknown>)[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('crm_activities').where({ id }).update(updates);
    }

    return trx('crm_activities').where({ id }).first() as Promise<Record<string, unknown>>;
  }

  // Delete activity
  async deleteActivity(trx: Knex.Transaction, id: number) {
    const existing = await trx('crm_activities').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Activity not found');

    await trx('crm_activities').where({ id }).delete();
    return { deleted: true, id };
  }

  // ─── Dashboard & Reports ───

  // CRM Dashboard — pipeline value by stage, conversion rate, win rate, avg deal size
  async getDashboard(trx: Knex.Transaction) {
    // Pipeline value by stage
    const stageValues = await trx('crm_opportunities')
      .leftJoin('crm_pipeline_stages', 'crm_opportunities.stage_id', 'crm_pipeline_stages.id')
      .where('crm_opportunities.status', 'open')
      .groupBy('crm_pipeline_stages.id', 'crm_pipeline_stages.name', 'crm_pipeline_stages.sort_order')
      .select(
        'crm_pipeline_stages.name as stage_name',
        'crm_pipeline_stages.sort_order',
        trx.raw('COUNT(crm_opportunities.id) as count'),
        trx.raw('COALESCE(SUM(crm_opportunities.value), 0) as total_value'),
        trx.raw('COALESCE(SUM(crm_opportunities.weighted_value), 0) as weighted_value'),
      )
      .orderBy('crm_pipeline_stages.sort_order', 'asc') as Record<string, unknown>[];

    // Win/loss counts
    const outcomes = await trx('crm_opportunities')
      .whereIn('status', ['won', 'lost'])
      .groupBy('status')
      .select(
        'status',
        trx.raw('COUNT(*) as count'),
        trx.raw('COALESCE(SUM(value), 0) as total_value'),
      ) as Record<string, unknown>[];

    const wonData = outcomes.find((o) => o.status === 'won');
    const lostData = outcomes.find((o) => o.status === 'lost');
    const wonCount = Number(wonData?.count ?? 0);
    const lostCount = Number(lostData?.count ?? 0);
    const totalClosed = wonCount + lostCount;

    const winRate = totalClosed > 0 ? Math.round(wonCount / totalClosed * 10000) / 100 : 0;
    const avgDealSize = wonCount > 0
      ? Math.round(Number(wonData?.total_value ?? 0) / wonCount * 100) / 100
      : 0;

    // Open pipeline total
    const openResult = await trx('crm_opportunities')
      .where('status', 'open')
      .select(
        trx.raw('COUNT(*) as count'),
        trx.raw('COALESCE(SUM(value), 0) as total_value'),
        trx.raw('COALESCE(SUM(weighted_value), 0) as weighted_value'),
      )
      .first() as Record<string, unknown> | undefined;

    return {
      pipeline_by_stage: stageValues,
      open_pipeline: {
        count: Number(openResult?.count ?? 0),
        total_value: Number(openResult?.total_value ?? 0),
        weighted_value: Number(openResult?.weighted_value ?? 0),
      },
      win_rate: winRate,
      avg_deal_size: avgDealSize,
      won: { count: wonCount, total_value: Number(wonData?.total_value ?? 0) },
      lost: { count: lostCount, total_value: Number(lostData?.total_value ?? 0) },
    };
  }

  // Sales pipeline report — detailed opportunity list with stages
  async getSalesPipelineReport(trx: Knex.Transaction) {
    const opportunities = await trx('crm_opportunities')
      .leftJoin('contacts', 'crm_opportunities.contact_id', 'contacts.id')
      .leftJoin('crm_pipeline_stages', 'crm_opportunities.stage_id', 'crm_pipeline_stages.id')
      .leftJoin('crm_pipelines', 'crm_opportunities.pipeline_id', 'crm_pipelines.id')
      .select(
        'crm_opportunities.*',
        'contacts.first_name as contact_first_name',
        'contacts.last_name as contact_last_name',
        'contacts.company_name as contact_company',
        'crm_pipeline_stages.name as stage_name',
        'crm_pipeline_stages.sort_order as stage_order',
        'crm_pipelines.name as pipeline_name',
      )
      .orderBy('crm_pipelines.name', 'asc')
      .orderBy('crm_pipeline_stages.sort_order', 'asc')
      .orderBy('crm_opportunities.value', 'desc') as Record<string, unknown>[];

    return { data: opportunities };
  }
}
