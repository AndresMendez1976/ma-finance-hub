// Manufacturing service — BOM CRUD, work order lifecycle, material/labor tracking, costing
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

export interface CreateBomInput {
  tenant_id: number;
  created_by: string;
  product_id: number;
  name: string;
  version?: string;
  yield_quantity?: number;
  notes?: string;
  lines: { component_product_id: number; quantity_required: number; unit_of_measure?: string; waste_percentage?: number; cost_per_unit?: number; notes?: string }[];
  labor?: { description: string; hours_required: number; hourly_rate: number }[];
  overhead?: { description: string; cost_type: 'fixed' | 'per_unit'; amount: number }[];
}

export interface UpdateBomInput {
  name?: string;
  version?: string;
  yield_quantity?: number;
  notes?: string;
  lines?: { component_product_id: number; quantity_required: number; unit_of_measure?: string; waste_percentage?: number; cost_per_unit?: number; notes?: string }[];
  labor?: { description: string; hours_required: number; hourly_rate: number }[];
  overhead?: { description: string; cost_type: 'fixed' | 'per_unit'; amount: number }[];
}

export interface CreateWorkOrderInput {
  tenant_id: number;
  created_by: string;
  bom_id: number;
  product_id: number;
  quantity_to_produce: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_start?: string;
  scheduled_end?: string;
  location_id?: number;
  notes?: string;
  assigned_to?: string;
}

export interface RecordMaterialsInput {
  date: string;
  lines: { product_id: number; quantity_used: number; unit_cost: number }[];
}

export interface RecordLaborInput {
  date: string;
  lines: { employee_id?: number; description: string; hours_worked: number; hourly_rate: number }[];
}

@Injectable()
export class ManufacturingService {
  // ── Auto-numbering ──────────────────────────────────────────────────

  private async nextWoNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('work_orders')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('wo_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'WO-0001';
    const num = parseInt(String(last.wo_number).replace('WO-', ''), 10);
    return `WO-${String(num + 1).padStart(4, '0')}`;
  }

  // ── BOM CRUD ────────────────────────────────────────────────────────

  async createBom(trx: Knex.Transaction, tenantId: number, createdBy: string, data: CreateBomInput) {
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    const [bom] = await trx('bill_of_materials')
      .insert({
        tenant_id: tenantId,
        product_id: data.product_id,
        name: data.name,
        version: data.version ?? '1.0',
        yield_quantity: data.yield_quantity ?? 1,
        notes: data.notes ?? null,
        status: 'active',
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    // Insert component lines
    const lineRows = data.lines.map((l, i) => ({
      bom_id: bom.id,
      tenant_id: tenantId,
      component_product_id: l.component_product_id,
      quantity_required: l.quantity_required,
      unit_of_measure: l.unit_of_measure ?? null,
      waste_percentage: l.waste_percentage ?? 0,
      cost_per_unit: l.cost_per_unit ?? 0,
      notes: l.notes ?? null,
      sort_order: i,
    }));
    const insertedLines = await trx('bom_lines').insert(lineRows).returning('*') as Record<string, unknown>[];

    // Insert labor entries
    let insertedLabor: Record<string, unknown>[] = [];
    if (data.labor && data.labor.length > 0) {
      const laborRows = data.labor.map((l, i) => ({
        bom_id: bom.id,
        tenant_id: tenantId,
        description: l.description,
        hours_required: l.hours_required,
        hourly_rate: l.hourly_rate,
        sort_order: i,
      }));
      insertedLabor = await trx('bom_labor').insert(laborRows).returning('*') as Record<string, unknown>[];
    }

    // Insert overhead entries
    let insertedOverhead: Record<string, unknown>[] = [];
    if (data.overhead && data.overhead.length > 0) {
      const overheadRows = data.overhead.map((o, i) => ({
        bom_id: bom.id,
        tenant_id: tenantId,
        description: o.description,
        cost_type: o.cost_type,
        amount: o.amount,
        sort_order: i,
      }));
      insertedOverhead = await trx('bom_overhead').insert(overheadRows).returning('*') as Record<string, unknown>[];
    }

    return { ...bom, lines: insertedLines, labor: insertedLabor, overhead: insertedOverhead };
  }

  async findAllBoms(
    trx: Knex.Transaction,
    filters: { status?: string; product_id?: number; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('bill_of_materials')
      .select('bill_of_materials.*')
      .orderBy('bill_of_materials.created_at', 'desc');

    if (filters.status) void query.where('bill_of_materials.status', filters.status);
    if (filters.product_id) void query.where('bill_of_materials.product_id', filters.product_id);

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

  async findOneBom(trx: Knex.Transaction, id: number) {
    const bom = await trx('bill_of_materials').where({ id }).first() as Record<string, unknown> | undefined;
    if (!bom) return null;

    const lines = await trx('bom_lines')
      .where({ bom_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];

    const labor = await trx('bom_labor')
      .where({ bom_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];

    const overhead = await trx('bom_overhead')
      .where({ bom_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];

    return { ...bom, lines, labor, overhead };
  }

  async updateBom(trx: Knex.Transaction, id: number, tenantId: number, data: UpdateBomInput) {
    const bom = await trx('bill_of_materials').where({ id }).first() as Record<string, unknown> | undefined;
    if (!bom) throw new NotFoundException('Bill of materials not found');

    // Check if any active work orders reference this BOM
    const activeWos = await trx('work_orders')
      .where({ bom_id: id })
      .whereIn('status', ['released', 'in_progress'])
      .select('id') as Record<string, unknown>[];
    if (activeWos.length > 0) throw new BadRequestException('Cannot modify BOM with active work orders');

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.version !== undefined) updates.version = data.version;
    if (data.yield_quantity !== undefined) updates.yield_quantity = data.yield_quantity;
    if (data.notes !== undefined) updates.notes = data.notes;

    if (Object.keys(updates).length > 0) {
      await trx('bill_of_materials').where({ id }).update(updates);
    }

    // Replace lines if provided
    if (data.lines) {
      await trx('bom_lines').where({ bom_id: id }).del();
      const lineRows = data.lines.map((l, i) => ({
        bom_id: id,
        tenant_id: tenantId,
        component_product_id: l.component_product_id,
        quantity_required: l.quantity_required,
        unit_of_measure: l.unit_of_measure ?? null,
        waste_percentage: l.waste_percentage ?? 0,
        cost_per_unit: l.cost_per_unit ?? 0,
        notes: l.notes ?? null,
        sort_order: i,
      }));
      await trx('bom_lines').insert(lineRows);
    }

    // Replace labor if provided
    if (data.labor) {
      await trx('bom_labor').where({ bom_id: id }).del();
      if (data.labor.length > 0) {
        const laborRows = data.labor.map((l, i) => ({
          bom_id: id,
          tenant_id: tenantId,
          description: l.description,
          hours_required: l.hours_required,
          hourly_rate: l.hourly_rate,
          sort_order: i,
        }));
        await trx('bom_labor').insert(laborRows);
      }
    }

    // Replace overhead if provided
    if (data.overhead) {
      await trx('bom_overhead').where({ bom_id: id }).del();
      if (data.overhead.length > 0) {
        const overheadRows = data.overhead.map((o, i) => ({
          bom_id: id,
          tenant_id: tenantId,
          description: o.description,
          cost_type: o.cost_type,
          amount: o.amount,
          sort_order: i,
        }));
        await trx('bom_overhead').insert(overheadRows);
      }
    }

    return this.findOneBom(trx, id);
  }

  async deleteBom(trx: Knex.Transaction, id: number) {
    const bom = await trx('bill_of_materials').where({ id }).first() as Record<string, unknown> | undefined;
    if (!bom) throw new NotFoundException('Bill of materials not found');

    const wos = await trx('work_orders')
      .where({ bom_id: id })
      .select('id') as Record<string, unknown>[];
    if (wos.length > 0) throw new BadRequestException('Cannot delete BOM with associated work orders');

    await trx('bom_overhead').where({ bom_id: id }).del();
    await trx('bom_labor').where({ bom_id: id }).del();
    await trx('bom_lines').where({ bom_id: id }).del();
    await trx('bill_of_materials').where({ id }).del();

    return { deleted: true };
  }

  // ── BOM Cost Estimate ───────────────────────────────────────────────

  async getBomCostEstimate(trx: Knex.Transaction, bomId: number) {
    const bom = await trx('bill_of_materials').where({ id: bomId }).first() as Record<string, unknown> | undefined;
    if (!bom) throw new NotFoundException('Bill of materials not found');

    const yieldQty = Number(bom.yield_quantity) || 1;

    // Component cost: sum(qty * (1 + waste%) * cost_per_unit)
    const lines = await trx('bom_lines')
      .where({ bom_id: bomId })
      .select('*') as Record<string, unknown>[];

    let materialCost = 0;
    const materialBreakdown: Record<string, unknown>[] = [];
    for (const l of lines) {
      const qty = Number(l.quantity_required);
      const waste = Number(l.waste_percentage) || 0;
      const cost = Number(l.cost_per_unit) || 0;
      const lineCost = Math.round(qty * (1 + waste / 100) * cost * 100) / 100;
      materialCost += lineCost;
      materialBreakdown.push({
        component_product_id: l.component_product_id,
        quantity_required: qty,
        waste_percentage: waste,
        cost_per_unit: cost,
        total_cost: lineCost,
      });
    }

    // Labor cost: sum(hours * rate)
    const laborEntries = await trx('bom_labor')
      .where({ bom_id: bomId })
      .select('*') as Record<string, unknown>[];

    let laborCost = 0;
    const laborBreakdown: Record<string, unknown>[] = [];
    for (const l of laborEntries) {
      const hours = Number(l.hours_required);
      const rate = Number(l.hourly_rate);
      const lineCost = Math.round(hours * rate * 100) / 100;
      laborCost += lineCost;
      laborBreakdown.push({
        description: l.description,
        hours_required: hours,
        hourly_rate: rate,
        total_cost: lineCost,
      });
    }

    // Overhead cost: sum(amount) for fixed, sum(amount * yield_qty) for per_unit
    const overheadEntries = await trx('bom_overhead')
      .where({ bom_id: bomId })
      .select('*') as Record<string, unknown>[];

    let overheadCost = 0;
    const overheadBreakdown: Record<string, unknown>[] = [];
    for (const o of overheadEntries) {
      const amount = Number(o.amount);
      const lineCost = o.cost_type === 'per_unit'
        ? Math.round(amount * yieldQty * 100) / 100
        : amount;
      overheadCost += lineCost;
      overheadBreakdown.push({
        description: o.description,
        cost_type: o.cost_type,
        amount,
        total_cost: lineCost,
      });
    }

    const totalCost = Math.round((materialCost + laborCost + overheadCost) * 100) / 100;
    const costPerUnit = yieldQty > 0 ? Math.round((totalCost / yieldQty) * 100) / 100 : 0;

    return {
      bom_id: bomId,
      product_id: bom.product_id,
      yield_quantity: yieldQty,
      material_cost: Math.round(materialCost * 100) / 100,
      labor_cost: Math.round(laborCost * 100) / 100,
      overhead_cost: Math.round(overheadCost * 100) / 100,
      total_cost: totalCost,
      cost_per_unit: costPerUnit,
      materials: materialBreakdown,
      labor: laborBreakdown,
      overhead: overheadBreakdown,
    };
  }

  // ── Work Order CRUD ─────────────────────────────────────────────────

  async createWorkOrder(trx: Knex.Transaction, tenantId: number, createdBy: string, data: CreateWorkOrderInput) {
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    // Verify BOM exists
    const bom = await trx('bill_of_materials').where({ id: data.bom_id }).first() as Record<string, unknown> | undefined;
    if (!bom) throw new NotFoundException('Bill of materials not found');

    // Compute estimated cost
    const estimate = await this.getBomCostEstimate(trx, data.bom_id);
    const yieldQty = Number(bom.yield_quantity) || 1;
    const batchMultiplier = data.quantity_to_produce / yieldQty;
    const estimatedCost = Math.round(estimate.total_cost * batchMultiplier * 100) / 100;

    const woNumber = await this.nextWoNumber(trx, tenantId);

    const [wo] = await trx('work_orders')
      .insert({
        tenant_id: tenantId,
        wo_number: woNumber,
        bom_id: data.bom_id,
        product_id: data.product_id,
        quantity_to_produce: data.quantity_to_produce,
        quantity_produced: 0,
        quantity_scrapped: 0,
        status: 'draft',
        priority: data.priority ?? 'normal',
        scheduled_start: data.scheduled_start ?? null,
        scheduled_end: data.scheduled_end ?? null,
        location_id: data.location_id ?? null,
        notes: data.notes ?? null,
        assigned_to: data.assigned_to ?? null,
        estimated_cost: estimatedCost,
        actual_cost: 0,
        variance: 0,
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    return wo;
  }

  async findAllWorkOrders(
    trx: Knex.Transaction,
    filters: { status?: string; product_id?: number; priority?: string; from?: string; to?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('work_orders')
      .select('work_orders.*')
      .orderBy('work_orders.created_at', 'desc');

    if (filters.status) void query.where('work_orders.status', filters.status);
    if (filters.product_id) void query.where('work_orders.product_id', filters.product_id);
    if (filters.priority) void query.where('work_orders.priority', filters.priority);
    if (filters.from) void query.where('work_orders.scheduled_start', '>=', filters.from);
    if (filters.to) void query.where('work_orders.scheduled_end', '<=', filters.to);

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

  async findOneWorkOrder(trx: Knex.Transaction, id: number) {
    const wo = await trx('work_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!wo) return null;

    const materials = await trx('work_order_material_usage')
      .where({ work_order_id: id })
      .orderBy('created_at', 'asc')
      .select('*') as Record<string, unknown>[];

    const labor = await trx('work_order_labor')
      .where({ work_order_id: id })
      .orderBy('created_at', 'asc')
      .select('*') as Record<string, unknown>[];

    return { ...wo, materials, labor };
  }

  // ── Work Order Lifecycle ────────────────────────────────────────────

  async releaseWorkOrder(trx: Knex.Transaction, id: number) {
    const wo = await trx('work_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!wo) throw new NotFoundException('Work order not found');
    if (wo.status !== 'draft') throw new BadRequestException(`Cannot release work order with status '${String(wo.status)}'`);

    const [updated] = await trx('work_orders')
      .where({ id })
      .update({ status: 'released' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  async startWorkOrder(trx: Knex.Transaction, id: number) {
    const wo = await trx('work_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!wo) throw new NotFoundException('Work order not found');
    if (wo.status !== 'released') throw new BadRequestException(`Cannot start work order with status '${String(wo.status)}'`);

    const [updated] = await trx('work_orders')
      .where({ id })
      .update({
        status: 'in_progress',
        actual_start: trx.fn.now(),
      })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  async recordMaterials(trx: Knex.Transaction, tenantId: number, workOrderId: number, data: RecordMaterialsInput) {
    const wo = await trx('work_orders').where({ id: workOrderId }).first() as Record<string, unknown> | undefined;
    if (!wo) throw new NotFoundException('Work order not found');
    if (wo.status !== 'in_progress') throw new BadRequestException('Work order must be in progress to record materials');

    const locationId = Number(wo.location_id) || null;

    // Check sufficient stock for each component before consuming
    for (const line of data.lines) {
      const stockResult = await trx('inventory_transactions')
        .where({ product_id: line.product_id })
        .modify((qb) => { if (locationId) void qb.where({ location_id: locationId }); })
        .sum('quantity as total')
        .first() as Record<string, unknown> | undefined;
      const currentStock = Number(stockResult?.total) || 0;
      if (currentStock < line.quantity_used) {
        throw new BadRequestException(
          `Insufficient stock for product ${String(line.product_id)}: available=${String(currentStock)}, required=${String(line.quantity_used)}`,
        );
      }
    }

    // Record material usage and create inventory transactions
    const usageRows: Record<string, unknown>[] = [];
    for (const line of data.lines) {
      const totalCost = Math.round(line.quantity_used * line.unit_cost * 100) / 100;

      const [usage] = await trx('work_order_material_usage')
        .insert({
          work_order_id: workOrderId,
          tenant_id: tenantId,
          product_id: line.product_id,
          quantity_used: line.quantity_used,
          unit_cost: line.unit_cost,
          total_cost: totalCost,
          usage_date: data.date,
        })
        .returning('*') as Record<string, unknown>[];
      usageRows.push(usage);

      // Create inventory transaction — assembly_out (negative quantity)
      await trx('inventory_transactions')
        .insert({
          tenant_id: tenantId,
          product_id: line.product_id,
          location_id: locationId,
          transaction_type: 'assembly_out',
          quantity: -line.quantity_used,
          unit_cost: line.unit_cost,
          total_cost: -totalCost,
          reference_type: 'work_order',
          reference_id: workOrderId,
        });
    }

    return { work_order_id: workOrderId, materials: usageRows };
  }

  async recordLabor(trx: Knex.Transaction, tenantId: number, workOrderId: number, data: RecordLaborInput) {
    const wo = await trx('work_orders').where({ id: workOrderId }).first() as Record<string, unknown> | undefined;
    if (!wo) throw new NotFoundException('Work order not found');
    if (wo.status !== 'in_progress') throw new BadRequestException('Work order must be in progress to record labor');

    const laborRows: Record<string, unknown>[] = [];
    for (const line of data.lines) {
      const totalCost = Math.round(line.hours_worked * line.hourly_rate * 100) / 100;

      const [entry] = await trx('work_order_labor')
        .insert({
          work_order_id: workOrderId,
          tenant_id: tenantId,
          employee_id: line.employee_id ?? null,
          description: line.description,
          hours_worked: line.hours_worked,
          hourly_rate: line.hourly_rate,
          total_cost: totalCost,
          labor_date: data.date,
        })
        .returning('*') as Record<string, unknown>[];
      laborRows.push(entry);
    }

    return { work_order_id: workOrderId, labor: laborRows };
  }

  async completeWorkOrder(trx: Knex.Transaction, tenantId: number, id: number, quantityProduced: number, quantityScrapped: number) {
    const wo = await trx('work_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!wo) throw new NotFoundException('Work order not found');
    if (wo.status !== 'in_progress') throw new BadRequestException(`Cannot complete work order with status '${String(wo.status)}'`);

    const locationId = Number(wo.location_id) || null;

    // Calculate actual cost from material_usage + labor entries
    const materialResult = await trx('work_order_material_usage')
      .where({ work_order_id: id })
      .sum('total_cost as total')
      .first() as Record<string, unknown> | undefined;
    const actualMaterialCost = Math.round((Number(materialResult?.total) || 0) * 100) / 100;

    const laborResult = await trx('work_order_labor')
      .where({ work_order_id: id })
      .sum('total_cost as total')
      .first() as Record<string, unknown> | undefined;
    const actualLaborCost = Math.round((Number(laborResult?.total) || 0) * 100) / 100;

    const actualCost = Math.round((actualMaterialCost + actualLaborCost) * 100) / 100;
    const estimatedCost = Number(wo.estimated_cost) || 0;
    const variance = Math.round((estimatedCost - actualCost) * 100) / 100;

    // Calculate unit cost of finished product
    const unitCost = quantityProduced > 0
      ? Math.round((actualCost / quantityProduced) * 100) / 100
      : 0;

    // Create inventory transaction — assembly_in for finished product (positive qty)
    await trx('inventory_transactions')
      .insert({
        tenant_id: tenantId,
        product_id: wo.product_id,
        location_id: locationId,
        transaction_type: 'assembly_in',
        quantity: quantityProduced,
        unit_cost: unitCost,
        total_cost: Math.round(quantityProduced * unitCost * 100) / 100,
        reference_type: 'work_order',
        reference_id: id,
      });

    // Create journal entries for cost flow
    // Find an open fiscal period
    const period = await trx('fiscal_periods')
      .where({ status: 'open' })
      .orderBy('start_date', 'desc')
      .first() as Record<string, unknown> | undefined;

    if (period) {
      const lastEntry = await trx('journal_entries')
        .where({ tenant_id: tenantId, fiscal_period_id: period.id })
        .max('entry_number as max_num')
        .first() as Record<string, unknown> | undefined;
      let entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

      // Journal Entry 1: Debit WIP, Credit Raw Materials + Labor + Overhead
      // WIP account typically 1400, Raw Materials 1300, Labor 5100, Overhead 5200
      const wipAccount = await trx('accounts').where({ account_code: '1400' }).select('id').first() as Record<string, unknown> | undefined;
      const rawMatAccount = await trx('accounts').where({ account_code: '1300' }).select('id').first() as Record<string, unknown> | undefined;
      const laborAccount = await trx('accounts').where({ account_code: '5100' }).select('id').first() as Record<string, unknown> | undefined;

      if (wipAccount && rawMatAccount && laborAccount) {
        const [wipEntry] = await trx('journal_entries')
          .insert({
            tenant_id: tenantId,
            fiscal_period_id: period.id,
            entry_number: entryNumber,
            reference: `WO-WIP-${String(wo.wo_number)}`,
            memo: `WIP for work order ${String(wo.wo_number)}`,
            status: 'posted',
            posted_at: trx.fn.now(),
          })
          .returning('*') as Record<string, unknown>[];

        const wipJournalLines: Record<string, unknown>[] = [
          {
            tenant_id: tenantId,
            journal_entry_id: wipEntry.id,
            account_id: wipAccount.id,
            debit: actualCost,
            credit: 0,
            description: `WIP - ${String(wo.wo_number)}`,
          },
        ];

        if (actualMaterialCost > 0) {
          wipJournalLines.push({
            tenant_id: tenantId,
            journal_entry_id: wipEntry.id,
            account_id: rawMatAccount.id,
            debit: 0,
            credit: actualMaterialCost,
            description: `Raw Materials consumed - ${String(wo.wo_number)}`,
          });
        }

        if (actualLaborCost > 0) {
          wipJournalLines.push({
            tenant_id: tenantId,
            journal_entry_id: wipEntry.id,
            account_id: laborAccount.id,
            debit: 0,
            credit: actualLaborCost,
            description: `Labor applied - ${String(wo.wo_number)}`,
          });
        }

        await trx('journal_lines').insert(wipJournalLines);

        // Journal Entry 2: Debit Finished Goods, Credit WIP
        entryNumber += 1;
        const fgAccount = await trx('accounts').where({ account_code: '1500' }).select('id').first() as Record<string, unknown> | undefined;

        if (fgAccount) {
          const [fgEntry] = await trx('journal_entries')
            .insert({
              tenant_id: tenantId,
              fiscal_period_id: period.id,
              entry_number: entryNumber,
              reference: `WO-FG-${String(wo.wo_number)}`,
              memo: `Finished goods from work order ${String(wo.wo_number)}`,
              status: 'posted',
              posted_at: trx.fn.now(),
            })
            .returning('*') as Record<string, unknown>[];

          await trx('journal_lines').insert([
            {
              tenant_id: tenantId,
              journal_entry_id: fgEntry.id,
              account_id: fgAccount.id,
              debit: actualCost,
              credit: 0,
              description: `Finished Goods - ${String(wo.wo_number)}`,
            },
            {
              tenant_id: tenantId,
              journal_entry_id: fgEntry.id,
              account_id: wipAccount.id,
              debit: 0,
              credit: actualCost,
              description: `WIP transfer to FG - ${String(wo.wo_number)}`,
            },
          ]);
        }
      }
    }

    // Update work order
    const [updated] = await trx('work_orders')
      .where({ id })
      .update({
        status: 'completed',
        quantity_produced: quantityProduced,
        quantity_scrapped: quantityScrapped,
        actual_cost: actualCost,
        variance,
        actual_end: trx.fn.now(),
      })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  async cancelWorkOrder(trx: Knex.Transaction, id: number) {
    const wo = await trx('work_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!wo) throw new NotFoundException('Work order not found');

    // Only allow cancel if no material usage or labor recorded
    const materials = await trx('work_order_material_usage')
      .where({ work_order_id: id })
      .select('id') as Record<string, unknown>[];
    if (materials.length > 0) {
      throw new BadRequestException('Cannot cancel work order with recorded material usage');
    }

    const labor = await trx('work_order_labor')
      .where({ work_order_id: id })
      .select('id') as Record<string, unknown>[];
    if (labor.length > 0) {
      throw new BadRequestException('Cannot cancel work order with recorded labor');
    }

    if (wo.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed work order');
    }

    const [updated] = await trx('work_orders')
      .where({ id })
      .update({ status: 'cancelled' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // ── Reports ─────────────────────────────────────────────────────────

  async getProductionCostReport(
    trx: Knex.Transaction,
    filters: { from?: string; to?: string; product_id?: number },
  ) {
    const query = trx('work_orders')
      .where('work_orders.status', 'completed')
      .select(
        'work_orders.id',
        'work_orders.wo_number',
        'work_orders.product_id',
        'work_orders.quantity_to_produce',
        'work_orders.quantity_produced',
        'work_orders.quantity_scrapped',
        'work_orders.estimated_cost',
        'work_orders.actual_cost',
        'work_orders.variance',
        'work_orders.actual_start',
        'work_orders.actual_end',
      )
      .orderBy('work_orders.actual_end', 'desc');

    if (filters.from) void query.where('work_orders.actual_end', '>=', filters.from);
    if (filters.to) void query.where('work_orders.actual_end', '<=', filters.to);
    if (filters.product_id) void query.where('work_orders.product_id', filters.product_id);

    const rows = await query as Record<string, unknown>[];

    // Aggregate totals
    let totalEstimated = 0;
    let totalActual = 0;
    let totalVariance = 0;
    let totalProduced = 0;
    let totalScrapped = 0;

    for (const r of rows) {
      totalEstimated += Number(r.estimated_cost) || 0;
      totalActual += Number(r.actual_cost) || 0;
      totalVariance += Number(r.variance) || 0;
      totalProduced += Number(r.quantity_produced) || 0;
      totalScrapped += Number(r.quantity_scrapped) || 0;
    }

    return {
      work_orders: rows,
      summary: {
        total_work_orders: rows.length,
        total_estimated_cost: Math.round(totalEstimated * 100) / 100,
        total_actual_cost: Math.round(totalActual * 100) / 100,
        total_variance: Math.round(totalVariance * 100) / 100,
        total_produced: totalProduced,
        total_scrapped: totalScrapped,
      },
    };
  }

  async getBomCostAnalysis(trx: Knex.Transaction, filters: { product_id?: number }) {
    const query = trx('bill_of_materials')
      .where('bill_of_materials.status', 'active')
      .select('bill_of_materials.*')
      .orderBy('bill_of_materials.name', 'asc');

    if (filters.product_id) void query.where('bill_of_materials.product_id', filters.product_id);

    const boms = await query as Record<string, unknown>[];

    const analysis: Record<string, unknown>[] = [];
    for (const bom of boms) {
      const estimate = await this.getBomCostEstimate(trx, Number(bom.id));
      analysis.push({
        bom_id: bom.id,
        name: bom.name,
        product_id: bom.product_id,
        version: bom.version,
        yield_quantity: bom.yield_quantity,
        material_cost: estimate.material_cost,
        labor_cost: estimate.labor_cost,
        overhead_cost: estimate.overhead_cost,
        total_cost: estimate.total_cost,
        cost_per_unit: estimate.cost_per_unit,
      });
    }

    return { boms: analysis };
  }
}
