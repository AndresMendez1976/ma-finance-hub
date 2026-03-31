// Tracking service — CRUD tracking dimensions with values
import { Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class TrackingService {
  // Create a new tracking dimension
  async createDimension(trx: Knex.Transaction, tenantId: number, data: { name: string }) {
    const [dimension] = await trx('tracking_dimensions').insert({
      tenant_id: tenantId,
      name: data.name,
      is_active: true,
    }).returning('*') as Record<string, unknown>[];
    return dimension;
  }

  // List all tracking dimensions with their values
  async findAllDimensions(trx: Knex.Transaction) {
    const dimensions = await trx('tracking_dimensions')
      .select('*')
      .orderBy('name', 'asc') as Record<string, unknown>[];

    for (const dim of dimensions) {
      const values = await trx('tracking_dimension_values')
        .where({ dimension_id: dim.id })
        .orderBy('sort_order', 'asc')
        .orderBy('value', 'asc')
        .select('*') as Record<string, unknown>[];
      dim.values = values;
    }

    return dimensions;
  }

  // Get single tracking dimension with values
  async findOneDimension(trx: Knex.Transaction, id: number) {
    const dimension = await trx('tracking_dimensions').where({ id }).first() as Record<string, unknown> | undefined;
    if (!dimension) return null;

    const values = await trx('tracking_dimension_values')
      .where({ dimension_id: id })
      .orderBy('sort_order', 'asc')
      .orderBy('value', 'asc')
      .select('*') as Record<string, unknown>[];
    dimension.values = values;

    return dimension;
  }

  // Update a tracking dimension
  async updateDimension(trx: Knex.Transaction, id: number, data: { name?: string; is_active?: boolean }) {
    const dimension = await trx('tracking_dimensions').where({ id }).first() as Record<string, unknown> | undefined;
    if (!dimension) throw new NotFoundException('Tracking dimension not found');

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.is_active !== undefined) updates.is_active = data.is_active;

    if (Object.keys(updates).length > 0) {
      await trx('tracking_dimensions').where({ id }).update(updates);
    }

    return this.findOneDimension(trx, id);
  }

  // Delete a tracking dimension and its values
  async deleteDimension(trx: Knex.Transaction, id: number) {
    const dimension = await trx('tracking_dimensions').where({ id }).first() as Record<string, unknown> | undefined;
    if (!dimension) throw new NotFoundException('Tracking dimension not found');

    await trx('tracking_dimension_values').where({ dimension_id: id }).del();
    await trx('tracking_dimensions').where({ id }).del();
    return { deleted: true };
  }

  // Add a value to a tracking dimension
  async addValue(trx: Knex.Transaction, tenantId: number, dimensionId: number, data: { value: string; sort_order?: number }) {
    const dimension = await trx('tracking_dimensions').where({ id: dimensionId }).first() as Record<string, unknown> | undefined;
    if (!dimension) throw new NotFoundException('Tracking dimension not found');

    const [value] = await trx('tracking_dimension_values').insert({
      tenant_id: tenantId,
      dimension_id: dimensionId,
      value: data.value,
      sort_order: data.sort_order ?? 0,
      is_active: true,
    }).returning('*') as Record<string, unknown>[];
    return value;
  }

  // Update a tracking dimension value
  async updateValue(trx: Knex.Transaction, id: number, data: { value?: string; is_active?: boolean; sort_order?: number }) {
    const existing = await trx('tracking_dimension_values').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Tracking dimension value not found');

    const updates: Record<string, unknown> = {};
    if (data.value !== undefined) updates.value = data.value;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    if (data.sort_order !== undefined) updates.sort_order = data.sort_order;

    if (Object.keys(updates).length > 0) {
      await trx('tracking_dimension_values').where({ id }).update(updates);
    }

    const [updated] = await trx('tracking_dimension_values').where({ id }).select('*') as Record<string, unknown>[];
    return updated;
  }

  // Delete a tracking dimension value
  async deleteValue(trx: Knex.Transaction, id: number) {
    const existing = await trx('tracking_dimension_values').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Tracking dimension value not found');

    await trx('tracking_dimension_values').where({ id }).del();
    return { deleted: true };
  }

  // Get only active dimensions with active values
  async getActiveDimensions(trx: Knex.Transaction) {
    const dimensions = await trx('tracking_dimensions')
      .where({ is_active: true })
      .select('*')
      .orderBy('name', 'asc') as Record<string, unknown>[];

    for (const dim of dimensions) {
      const values = await trx('tracking_dimension_values')
        .where({ dimension_id: dim.id, is_active: true })
        .orderBy('sort_order', 'asc')
        .orderBy('value', 'asc')
        .select('*') as Record<string, unknown>[];
      dim.values = values;
    }

    return dimensions;
  }
}
