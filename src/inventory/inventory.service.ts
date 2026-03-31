// Inventory service — products CRUD, locations, adjustments, transfers, stock reports
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { InventoryCostingService } from './inventory-costing.service';

export interface CreateProductInput {
  tenant_id: number;
  created_by: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  type: string;
  costing_method?: string;
  unit_of_measure?: string;
  sale_price?: number;
  purchase_price?: number;
  revenue_account_id?: number;
  cogs_account_id?: number;
  inventory_account_id?: number;
  expense_account_id?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  is_active?: boolean;
  track_lots?: boolean;
  track_serials?: boolean;
}

export interface UpdateProductInput {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  type?: string;
  costing_method?: string;
  unit_of_measure?: string;
  sale_price?: number;
  purchase_price?: number;
  revenue_account_id?: number;
  cogs_account_id?: number;
  inventory_account_id?: number;
  expense_account_id?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  is_active?: boolean;
  track_lots?: boolean;
  track_serials?: boolean;
}

export interface CreateAdjustmentInput {
  tenant_id: number;
  created_by: string;
  date: string;
  reason?: string;
  lines: { product_id: number; location_id: number; lot_id?: number; qty_on_hand: number; qty_counted: number; unit_cost: number }[];
}

export interface CreateTransferInput {
  tenant_id: number;
  created_by: string;
  from_location_id: number;
  to_location_id: number;
  date: string;
  notes?: string;
  lines: { product_id: number; lot_id?: number; serial_number?: string; quantity: number }[];
}

@Injectable()
export class InventoryService {
  constructor(private readonly costingService: InventoryCostingService) {}

  // ─── Auto-number generation ───

  private async nextAdjustmentNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('inventory_adjustments')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('adjustment_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'ADJ-0001';
    const num = parseInt(String(last.adjustment_number).replace('ADJ-', ''), 10);
    return `ADJ-${String(num + 1).padStart(4, '0')}`;
  }

  private async nextTransferNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('inventory_transfers')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('transfer_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'TRF-0001';
    const num = parseInt(String(last.transfer_number).replace('TRF-', ''), 10);
    return `TRF-${String(num + 1).padStart(4, '0')}`;
  }

  // ─── CSV Import/Export ───

  async importProductsCsv(trx: Knex.Transaction, tenantId: number, csvContent: string) {
    const lines = csvContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) throw new BadRequestException('CSV must contain a header row and at least one data row');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const dataLines = lines.slice(1);
    const errors: string[] = [];
    let imported = 0;
    const products: Record<string, unknown>[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const parts = dataLines[i].split(',').map((p) => p.trim());
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = parts[j] ?? '';
      }

      if (!row.sku || !row.name || !row.type) {
        errors.push(`Row ${String(i + 2)}: Missing required fields (sku, name, type)`);
        continue;
      }

      if (!['inventory', 'non_inventory', 'service'].includes(row.type)) {
        errors.push(`Row ${String(i + 2)}: Invalid type '${row.type}'`);
        continue;
      }

      // Check for duplicate SKU
      const existing = await trx('products').where({ tenant_id: tenantId, sku: row.sku }).first() as Record<string, unknown> | undefined;
      if (existing) {
        errors.push(`Row ${String(i + 2)}: Product with SKU '${row.sku}' already exists`);
        continue;
      }

      const [product] = await trx('products').insert({
        tenant_id: tenantId,
        sku: row.sku,
        name: row.name,
        description: row.description || null,
        category: row.category || null,
        type: row.type,
        unit_of_measure: row.unit_of_measure || null,
        sale_price: row.sale_price ? parseFloat(row.sale_price) : null,
        purchase_price: row.purchase_price ? parseFloat(row.purchase_price) : null,
        reorder_point: row.reorder_point ? parseFloat(row.reorder_point) : null,
        reorder_quantity: row.reorder_quantity ? parseFloat(row.reorder_quantity) : null,
        is_active: true,
      }).returning('*') as Record<string, unknown>[];

      products.push(product);
      imported++;
    }

    return { imported, errors, products };
  }

  async exportProductsCsv(trx: Knex.Transaction): Promise<string> {
    const products = await trx('products')
      .select('*')
      .orderBy('created_at', 'desc') as Record<string, unknown>[];

    const headers = ['id', 'sku', 'name', 'description', 'category', 'type', 'costing_method', 'unit_of_measure', 'sale_price', 'purchase_price', 'reorder_point', 'reorder_quantity', 'is_active'];
    const csvLines = [headers.join(',')];

    for (const product of products) {
      const row = headers.map((h) => {
        const val = product[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(row.join(','));
    }

    return csvLines.join('\n');
  }

  // ─── Products CRUD ───

  async createProduct(trx: Knex.Transaction, tenantId: number, data: CreateProductInput) {
    // Check for duplicate SKU within tenant
    const existing = await trx('products')
      .where({ tenant_id: tenantId, sku: data.sku })
      .first() as Record<string, unknown> | undefined;
    if (existing) throw new BadRequestException(`Product with SKU '${data.sku}' already exists`);

    const [product] = await trx('products')
      .insert({
        tenant_id: tenantId,
        sku: data.sku,
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? null,
        type: data.type,
        costing_method: data.costing_method ?? 'average_cost',
        unit_of_measure: data.unit_of_measure ?? null,
        sale_price: data.sale_price ?? null,
        purchase_price: data.purchase_price ?? null,
        revenue_account_id: data.revenue_account_id ?? null,
        cogs_account_id: data.cogs_account_id ?? null,
        inventory_account_id: data.inventory_account_id ?? null,
        expense_account_id: data.expense_account_id ?? null,
        reorder_point: data.reorder_point ?? null,
        reorder_quantity: data.reorder_quantity ?? null,
        is_active: data.is_active ?? true,
        track_lots: data.track_lots ?? false,
        track_serials: data.track_serials ?? false,
      })
      .returning('*') as Record<string, unknown>[];

    return product;
  }

  async findAllProducts(
    trx: Knex.Transaction,
    filters: { category?: string; type?: string; search?: string; is_active?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('products')
      .select('products.*')
      .orderBy('products.created_at', 'desc');

    if (filters.category) void query.where('products.category', filters.category);
    if (filters.type) void query.where('products.type', filters.type);
    if (filters.is_active !== undefined) void query.where('products.is_active', filters.is_active === 'true');
    if (filters.search) {
      const searchTerm = filters.search;
      void query.where(function (this: Knex.QueryBuilder) {
        void this.where('products.sku', 'ilike', `%${searchTerm}%`)
          .orWhere('products.name', 'ilike', `%${searchTerm}%`);
      });
    }

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

  async findOneProduct(trx: Knex.Transaction, id: number) {
    const product = await trx('products').where({ id }).first() as Record<string, unknown> | undefined;
    if (!product) return null;
    return product;
  }

  async updateProduct(trx: Knex.Transaction, id: number, tenantId: number, data: UpdateProductInput) {
    const product = await trx('products').where({ id }).first() as Record<string, unknown> | undefined;
    if (!product) throw new NotFoundException('Product not found');

    const updates: Record<string, unknown> = {};
    if (data.sku !== undefined) {
      // Check for duplicate SKU within tenant (exclude current product)
      const existing = await trx('products')
        .where({ tenant_id: tenantId, sku: data.sku })
        .whereNot({ id })
        .first() as Record<string, unknown> | undefined;
      if (existing) throw new BadRequestException(`Product with SKU '${data.sku}' already exists`);
      updates.sku = data.sku;
    }
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.category !== undefined) updates.category = data.category;
    if (data.type !== undefined) updates.type = data.type;
    if (data.costing_method !== undefined) updates.costing_method = data.costing_method;
    if (data.unit_of_measure !== undefined) updates.unit_of_measure = data.unit_of_measure;
    if (data.sale_price !== undefined) updates.sale_price = data.sale_price;
    if (data.purchase_price !== undefined) updates.purchase_price = data.purchase_price;
    if (data.revenue_account_id !== undefined) updates.revenue_account_id = data.revenue_account_id;
    if (data.cogs_account_id !== undefined) updates.cogs_account_id = data.cogs_account_id;
    if (data.inventory_account_id !== undefined) updates.inventory_account_id = data.inventory_account_id;
    if (data.expense_account_id !== undefined) updates.expense_account_id = data.expense_account_id;
    if (data.reorder_point !== undefined) updates.reorder_point = data.reorder_point;
    if (data.reorder_quantity !== undefined) updates.reorder_quantity = data.reorder_quantity;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    if (data.track_lots !== undefined) updates.track_lots = data.track_lots;
    if (data.track_serials !== undefined) updates.track_serials = data.track_serials;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = trx.fn.now();
      await trx('products').where({ id }).update(updates);
    }

    return this.findOneProduct(trx, id);
  }

  // ─── Product Stock ───

  async getProductStock(trx: Knex.Transaction, productId: number) {
    const product = await trx('products').where({ id: productId }).first() as Record<string, unknown> | undefined;
    if (!product) throw new NotFoundException('Product not found');

    const stockByLocation = await this.costingService.getStockByLocation(trx, productId);
    const totalStock = await this.costingService.getTotalStock(trx, productId);

    // Enrich with location names
    const locationIds = stockByLocation.map((s) => Number(s.location_id));
    let locations: Record<string, unknown>[] = [];
    if (locationIds.length > 0) {
      locations = await trx('inventory_locations')
        .whereIn('id', locationIds)
        .select('*') as Record<string, unknown>[];
    }

    const stockDetails = stockByLocation.map((s) => {
      const loc = locations.find((l) => Number(l.id) === Number(s.location_id));
      return {
        location_id: Number(s.location_id),
        location_name: loc ? String(loc.name) : 'Unknown',
        quantity: Number(s.quantity),
      };
    });

    return { product_id: productId, total_stock: totalStock, by_location: stockDetails };
  }

  async getProductTransactions(
    trx: Knex.Transaction,
    productId: number,
    filters: { page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('inventory_transactions')
      .where({ product_id: productId })
      .orderBy('created_at', 'desc');

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query.select('*') as Record<string, unknown>[];

    return {
      data: rows,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    };
  }

  async getLowStockProducts(trx: Knex.Transaction) {
    // Products with total stock below reorder_point
    const products = await trx('products')
      .whereNotNull('reorder_point')
      .where('is_active', true)
      .where('type', 'inventory')
      .select('*') as Record<string, unknown>[];

    const results: Record<string, unknown>[] = [];

    for (const product of products) {
      const totalStock = await this.costingService.getTotalStock(trx, Number(product.id));
      const reorderPoint = Number(product.reorder_point);
      if (totalStock <= reorderPoint) {
        results.push({
          ...product,
          current_stock: totalStock,
          reorder_point: reorderPoint,
          reorder_quantity: Number(product.reorder_quantity) || 0,
          deficit: reorderPoint - totalStock,
        });
      }
    }

    return results;
  }

  // ─── Inventory Locations CRUD ───

  async createLocation(trx: Knex.Transaction, tenantId: number, data: { name: string; address?: string; is_active?: boolean }) {
    const [location] = await trx('inventory_locations')
      .insert({
        tenant_id: tenantId,
        name: data.name,
        address: data.address ?? null,
        is_active: data.is_active ?? true,
      })
      .returning('*') as Record<string, unknown>[];
    return location;
  }

  async findAllLocations(trx: Knex.Transaction) {
    return trx('inventory_locations')
      .orderBy('name', 'asc')
      .select('*') as Promise<Record<string, unknown>[]>;
  }

  async findOneLocation(trx: Knex.Transaction, id: number) {
    const location = await trx('inventory_locations').where({ id }).first() as Record<string, unknown> | undefined;
    if (!location) return null;
    return location;
  }

  async updateLocation(trx: Knex.Transaction, id: number, data: { name?: string; address?: string; is_active?: boolean }) {
    const location = await trx('inventory_locations').where({ id }).first() as Record<string, unknown> | undefined;
    if (!location) throw new NotFoundException('Location not found');

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.address !== undefined) updates.address = data.address;
    if (data.is_active !== undefined) updates.is_active = data.is_active;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = trx.fn.now();
      await trx('inventory_locations').where({ id }).update(updates);
    }

    return this.findOneLocation(trx, id);
  }

  // ─── Inventory Adjustments ───

  async createAdjustment(trx: Knex.Transaction, tenantId: number, createdBy: string, data: CreateAdjustmentInput) {
    const adjustmentNumber = await this.nextAdjustmentNumber(trx, tenantId);

    // Resolve user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for adjustment creation');

    const [adjustment] = await trx('inventory_adjustments')
      .insert({
        tenant_id: tenantId,
        adjustment_number: adjustmentNumber,
        date: data.date,
        reason: data.reason ?? null,
        status: 'draft',
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    const lineRows = data.lines.map((l, i) => ({
      adjustment_id: adjustment.id,
      tenant_id: tenantId,
      product_id: l.product_id,
      location_id: l.location_id,
      lot_id: l.lot_id ?? null,
      qty_on_hand: l.qty_on_hand,
      qty_counted: l.qty_counted,
      variance: l.qty_counted - l.qty_on_hand,
      unit_cost: l.unit_cost,
      total_cost: Math.round((l.qty_counted - l.qty_on_hand) * l.unit_cost * 100) / 100,
      sort_order: i,
    }));

    const insertedLines = await trx('inventory_adjustment_lines').insert(lineRows).returning('*') as Record<string, unknown>[];
    return { ...adjustment, lines: insertedLines };
  }

  async findAllAdjustments(
    trx: Knex.Transaction,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('inventory_adjustments')
      .select('*')
      .orderBy('created_at', 'desc');

    if (filters.status) void query.where('status', filters.status);

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

  async postAdjustment(trx: Knex.Transaction, tenantId: number, id: number) {
    const adjustment = await trx('inventory_adjustments').where({ id }).first() as Record<string, unknown> | undefined;
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    if (adjustment.status !== 'draft') throw new BadRequestException('Only draft adjustments can be posted');

    const lines = await trx('inventory_adjustment_lines')
      .where({ adjustment_id: id })
      .select('*') as Record<string, unknown>[];

    // Create inventory transactions for each line
    for (const line of lines) {
      const variance = Number(line.variance);
      if (variance === 0) continue;

      await trx('inventory_transactions').insert({
        tenant_id: tenantId,
        product_id: line.product_id,
        location_id: line.location_id,
        lot_id: line.lot_id ?? null,
        transaction_type: 'adjustment',
        reference_type: 'inventory_adjustments',
        reference_id: id,
        quantity: variance,
        unit_cost: line.unit_cost,
        total_cost: Math.round(variance * Number(line.unit_cost) * 100) / 100,
      });
    }

    // Create journal entry for adjustment value
    const totalAdjustmentValue = lines.reduce((sum, l) => sum + Number(l.total_cost), 0);

    if (totalAdjustmentValue !== 0) {
      // Get open fiscal period
      const period = await trx('fiscal_periods')
        .where({ status: 'open' })
        .orderBy('start_date', 'desc')
        .first() as Record<string, unknown> | undefined;

      if (period) {
        const lastEntry = await trx('journal_entries')
          .where({ tenant_id: tenantId, fiscal_period_id: period.id })
          .max('entry_number as max_num')
          .first() as Record<string, unknown> | undefined;
        const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

        const [entry] = await trx('journal_entries')
          .insert({
            tenant_id: tenantId,
            fiscal_period_id: period.id,
            entry_number: entryNumber,
            reference: String(adjustment.adjustment_number),
            memo: `Inventory adjustment ${String(adjustment.adjustment_number)}${adjustment.reason ? ' - ' + String(adjustment.reason) : ''}`,
            status: 'posted',
            posted_at: trx.fn.now(),
          })
          .returning('*') as Record<string, unknown>[];

        const journalLines: Record<string, unknown>[] = [];

        // For each adjustment line, create journal entries using product accounts
        for (const line of lines) {
          const variance = Number(line.variance);
          if (variance === 0) continue;
          const lineCost = Math.abs(Math.round(variance * Number(line.unit_cost) * 100) / 100);

          const product = await trx('products')
            .where({ id: line.product_id })
            .first() as Record<string, unknown> | undefined;

          const inventoryAccountId = product?.inventory_account_id;
          const expenseAccountId = product?.expense_account_id;

          if (inventoryAccountId && expenseAccountId) {
            if (variance > 0) {
              // Stock increase: debit inventory, credit expense (shrinkage reversal)
              journalLines.push({
                tenant_id: tenantId,
                journal_entry_id: entry.id,
                account_id: inventoryAccountId,
                debit: lineCost,
                credit: 0,
                description: `Inventory adjustment increase - ${String(product?.name)}`,
              });
              journalLines.push({
                tenant_id: tenantId,
                journal_entry_id: entry.id,
                account_id: expenseAccountId,
                debit: 0,
                credit: lineCost,
                description: `Inventory adjustment increase - ${String(product?.name)}`,
              });
            } else {
              // Stock decrease: debit expense, credit inventory
              journalLines.push({
                tenant_id: tenantId,
                journal_entry_id: entry.id,
                account_id: expenseAccountId,
                debit: lineCost,
                credit: 0,
                description: `Inventory adjustment decrease - ${String(product?.name)}`,
              });
              journalLines.push({
                tenant_id: tenantId,
                journal_entry_id: entry.id,
                account_id: inventoryAccountId,
                debit: 0,
                credit: lineCost,
                description: `Inventory adjustment decrease - ${String(product?.name)}`,
              });
            }
          }
        }

        if (journalLines.length > 0) {
          await trx('journal_lines').insert(journalLines);
        }
      }
    }

    // Update adjustment status
    const [updated] = await trx('inventory_adjustments')
      .where({ id })
      .update({ status: 'posted', posted_at: trx.fn.now() })
      .returning('*') as Record<string, unknown>[];

    return { ...updated, lines };
  }

  // ─── Inventory Transfers ───

  async createTransfer(trx: Knex.Transaction, tenantId: number, createdBy: string, data: CreateTransferInput) {
    if (data.from_location_id === data.to_location_id) {
      throw new BadRequestException('Source and destination locations must be different');
    }

    const transferNumber = await this.nextTransferNumber(trx, tenantId);

    // Validate locations exist
    const fromLoc = await trx('inventory_locations').where({ id: data.from_location_id }).first() as Record<string, unknown> | undefined;
    if (!fromLoc) throw new BadRequestException('Source location not found');
    const toLoc = await trx('inventory_locations').where({ id: data.to_location_id }).first() as Record<string, unknown> | undefined;
    if (!toLoc) throw new BadRequestException('Destination location not found');

    // Resolve user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for transfer creation');

    const [transfer] = await trx('inventory_transfers')
      .insert({
        tenant_id: tenantId,
        transfer_number: transferNumber,
        from_location_id: data.from_location_id,
        to_location_id: data.to_location_id,
        date: data.date,
        notes: data.notes ?? null,
        status: 'draft',
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    const lineRows = data.lines.map((l, i) => ({
      transfer_id: transfer.id,
      tenant_id: tenantId,
      product_id: l.product_id,
      lot_id: l.lot_id ?? null,
      serial_number: l.serial_number ?? null,
      quantity: l.quantity,
      sort_order: i,
    }));

    const insertedLines = await trx('inventory_transfer_lines').insert(lineRows).returning('*') as Record<string, unknown>[];
    return { ...transfer, lines: insertedLines };
  }

  async findAllTransfers(
    trx: Knex.Transaction,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('inventory_transfers')
      .select('*')
      .orderBy('created_at', 'desc');

    if (filters.status) void query.where('status', filters.status);

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

  async completeTransfer(trx: Knex.Transaction, tenantId: number, id: number) {
    const transfer = await trx('inventory_transfers').where({ id }).first() as Record<string, unknown> | undefined;
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'draft') throw new BadRequestException('Only draft transfers can be completed');

    const lines = await trx('inventory_transfer_lines')
      .where({ transfer_id: id })
      .select('*') as Record<string, unknown>[];

    const fromLocationId = Number(transfer.from_location_id);
    const toLocationId = Number(transfer.to_location_id);

    // Validate sufficient stock at source location for each line
    for (const line of lines) {
      const currentStock = await this.costingService.getStock(trx, Number(line.product_id), fromLocationId);
      if (currentStock < Number(line.quantity)) {
        const product = await trx('products').where({ id: line.product_id }).first() as Record<string, unknown> | undefined;
        throw new BadRequestException(
          `Insufficient stock for product '${String(product?.name ?? line.product_id)}' at source location. Available: ${String(currentStock)}, requested: ${String(line.quantity)}`,
        );
      }
    }

    // Create transfer_out and transfer_in inventory transactions for each line
    for (const line of lines) {
      const qty = Number(line.quantity);
      const product = await trx('products').where({ id: line.product_id }).first() as Record<string, unknown> | undefined;

      // Determine unit cost based on costing method
      let unitCost = 0;
      const costingMethod = String(product?.costing_method ?? 'average_cost');

      if (costingMethod === 'fifo') {
        const result = await this.costingService.calculateFifoCost(trx, Number(line.product_id), fromLocationId, qty);
        unitCost = result.totalCost / qty;
      } else if (costingMethod === 'lifo') {
        const result = await this.costingService.calculateLifoCost(trx, Number(line.product_id), fromLocationId, qty);
        unitCost = result.totalCost / qty;
      } else {
        const result = await this.costingService.calculateAverageCost(trx, Number(line.product_id), fromLocationId, qty);
        unitCost = result.unitCost;
      }

      const totalCost = Math.round(qty * unitCost * 100) / 100;

      // Transfer out (negative from source)
      await trx('inventory_transactions').insert({
        tenant_id: tenantId,
        product_id: line.product_id,
        location_id: fromLocationId,
        lot_id: line.lot_id ?? null,
        transaction_type: 'transfer_out',
        reference_type: 'inventory_transfers',
        reference_id: id,
        quantity: -qty,
        unit_cost: unitCost,
        total_cost: -totalCost,
      });

      // Transfer in (positive to destination)
      await trx('inventory_transactions').insert({
        tenant_id: tenantId,
        product_id: line.product_id,
        location_id: toLocationId,
        lot_id: line.lot_id ?? null,
        transaction_type: 'transfer_in',
        reference_type: 'inventory_transfers',
        reference_id: id,
        quantity: qty,
        unit_cost: unitCost,
        total_cost: totalCost,
      });
    }

    // Update transfer status
    const [updated] = await trx('inventory_transfers')
      .where({ id })
      .update({ status: 'completed', completed_at: trx.fn.now() })
      .returning('*') as Record<string, unknown>[];

    return { ...updated, lines };
  }

  // ─── Reports ───

  async getStockStatus(trx: Knex.Transaction) {
    const products = await trx('products')
      .where('type', 'inventory')
      .where('is_active', true)
      .orderBy('name', 'asc')
      .select('*') as Record<string, unknown>[];

    const results: Record<string, unknown>[] = [];

    for (const product of products) {
      const totalStock = await this.costingService.getTotalStock(trx, Number(product.id));
      const stockByLocation = await this.costingService.getStockByLocation(trx, Number(product.id));

      results.push({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit_of_measure: product.unit_of_measure,
        total_stock: totalStock,
        reorder_point: product.reorder_point,
        reorder_quantity: product.reorder_quantity,
        is_low_stock: product.reorder_point != null && totalStock <= Number(product.reorder_point),
        locations: stockByLocation.map((s) => ({
          location_id: Number(s.location_id),
          quantity: Number(s.quantity),
        })),
      });
    }

    return results;
  }
}
