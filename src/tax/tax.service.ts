// Tax service — CRUD tax rates with components, default rate, seed data
import { Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class TaxService {
  // Create a tax rate with optional components
  async create(trx: Knex.Transaction, tenantId: number, data: {
    name: string; jurisdiction: string; rate: number; is_compound?: boolean;
    is_default?: boolean; description?: string; effective_date: string;
    expiration_date?: string;
    components?: { name: string; rate: number; jurisdiction_level: string }[];
  }) {
    // If setting as default, unset other defaults first
    if (data.is_default) {
      await trx('tax_rates').where({ tenant_id: tenantId, is_default: true }).update({ is_default: false });
    }

    const [taxRate] = await trx('tax_rates').insert({
      tenant_id: tenantId,
      name: data.name,
      jurisdiction: data.jurisdiction,
      rate: data.rate,
      is_compound: data.is_compound ?? false,
      is_default: data.is_default ?? false,
      description: data.description ?? null,
      effective_date: data.effective_date,
      expiration_date: data.expiration_date ?? null,
    }).returning('*') as Record<string, unknown>[];

    // Insert components if provided
    if (data.components && data.components.length > 0) {
      const componentRows = data.components.map((c, idx) => ({
        tax_rate_id: taxRate.id,
        tenant_id: tenantId,
        name: c.name,
        rate: c.rate,
        jurisdiction_level: c.jurisdiction_level,
        sort_order: idx + 1,
      }));
      await trx('tax_rate_components').insert(componentRows);
    }

    return this.findOne(trx, Number(taxRate.id));
  }

  // List all tax rates with components
  async findAll(trx: Knex.Transaction, filters?: {
    jurisdiction?: string; page?: number; limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('tax_rates').select('*').orderBy('name', 'asc');
    if (filters?.jurisdiction) void query.where('jurisdiction', filters.jurisdiction);

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];

    // Fetch components for each rate
    const rateIds = rows.map((r) => Number(r.id));
    const components = rateIds.length > 0
      ? await trx('tax_rate_components').whereIn('tax_rate_id', rateIds).orderBy('sort_order', 'asc') as Record<string, unknown>[]
      : [];

    const data = rows.map((r) => ({
      ...r,
      components: components.filter((c) => c.tax_rate_id === r.id),
    }));

    return {
      data,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    };
  }

  // Get single tax rate with components
  async findOne(trx: Knex.Transaction, id: number) {
    const rate = await trx('tax_rates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!rate) return null;

    const components = await trx('tax_rate_components')
      .where({ tax_rate_id: id })
      .orderBy('sort_order', 'asc') as Record<string, unknown>[];

    return { ...rate, components };
  }

  // Get default tax rate
  async getDefaultRate(trx: Knex.Transaction) {
    const rate = await trx('tax_rates').where({ is_default: true }).first() as Record<string, unknown> | undefined;
    if (!rate) return null;

    const components = await trx('tax_rate_components')
      .where({ tax_rate_id: rate.id })
      .orderBy('sort_order', 'asc') as Record<string, unknown>[];

    return { ...rate, components };
  }

  // Update tax rate
  async update(trx: Knex.Transaction, id: number, tenantId: number, data: {
    name?: string; jurisdiction?: string; rate?: number; is_compound?: boolean;
    is_default?: boolean; description?: string; effective_date?: string;
    expiration_date?: string;
    components?: { name: string; rate: number; jurisdiction_level: string }[];
  }) {
    const existing = await trx('tax_rates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Tax rate not found');

    if (data.is_default) {
      await trx('tax_rates').where({ tenant_id: tenantId, is_default: true }).whereNot({ id }).update({ is_default: false });
    }

    const updates: Record<string, unknown> = {};
    const fields = ['name', 'jurisdiction', 'rate', 'is_compound', 'is_default', 'description', 'effective_date', 'expiration_date'] as const;
    for (const field of fields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        updates[field] = (data as Record<string, unknown>)[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('tax_rates').where({ id }).update(updates);
    }

    // Replace components if provided
    if (data.components !== undefined) {
      await trx('tax_rate_components').where({ tax_rate_id: id }).delete();
      if (data.components.length > 0) {
        const componentRows = data.components.map((c, idx) => ({
          tax_rate_id: id,
          tenant_id: tenantId,
          name: c.name,
          rate: c.rate,
          jurisdiction_level: c.jurisdiction_level,
          sort_order: idx + 1,
        }));
        await trx('tax_rate_components').insert(componentRows);
      }
    }

    return this.findOne(trx, id);
  }

  // Delete tax rate and components
  async delete(trx: Knex.Transaction, id: number) {
    const existing = await trx('tax_rates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Tax rate not found');

    await trx('tax_rate_components').where({ tax_rate_id: id }).delete();
    await trx('tax_rates').where({ id }).delete();
    return { deleted: true, id };
  }

  // Seed default tax rates for top 5 US states
  async seedDefaults(trx: Knex.Transaction, tenantId: number) {
    const states = [
      { name: 'California Sales Tax', jurisdiction: 'CA', rate: 7.25, effective_date: '2024-01-01' },
      { name: 'Texas Sales Tax', jurisdiction: 'TX', rate: 6.25, effective_date: '2024-01-01' },
      { name: 'New York Sales Tax', jurisdiction: 'NY', rate: 8.0, effective_date: '2024-01-01' },
      { name: 'Florida Sales Tax', jurisdiction: 'FL', rate: 6.0, effective_date: '2024-01-01' },
      { name: 'Illinois Sales Tax', jurisdiction: 'IL', rate: 6.25, effective_date: '2024-01-01' },
    ];

    const results: Record<string, unknown>[] = [];
    for (const state of states) {
      const existing = await trx('tax_rates')
        .where({ tenant_id: tenantId, jurisdiction: state.jurisdiction })
        .first() as Record<string, unknown> | undefined;
      if (!existing) {
        const [row] = await trx('tax_rates').insert({
          tenant_id: tenantId,
          ...state,
          is_compound: false,
          is_default: false,
        }).returning('*') as Record<string, unknown>[];
        results.push(row);
      }
    }

    return results;
  }
}
