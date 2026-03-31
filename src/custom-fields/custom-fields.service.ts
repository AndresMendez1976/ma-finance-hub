// Custom fields service — CRUD definitions, get/set field values for entities
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class CustomFieldsService {
  // Create a new custom field definition
  async createDefinition(trx: Knex.Transaction, tenantId: number, data: {
    entity_type: string; field_name: string; field_label: string; field_type: string;
    select_options?: string[]; is_required?: boolean; sort_order?: number;
  }) {
    // Check for duplicate field_name within same entity_type and tenant
    const existing = await trx('custom_field_definitions')
      .where({ tenant_id: tenantId, entity_type: data.entity_type, field_name: data.field_name })
      .first() as Record<string, unknown> | undefined;
    if (existing) throw new BadRequestException(`Custom field '${data.field_name}' already exists for entity type '${data.entity_type}'`);

    const [definition] = await trx('custom_field_definitions').insert({
      tenant_id: tenantId,
      entity_type: data.entity_type,
      field_name: data.field_name,
      field_label: data.field_label,
      field_type: data.field_type,
      select_options: data.select_options ? JSON.stringify(data.select_options) : null,
      is_required: data.is_required ?? false,
      sort_order: data.sort_order ?? 0,
      is_active: true,
    }).returning('*') as Record<string, unknown>[];

    return {
      ...definition,
      select_options: definition.select_options
        ? (typeof definition.select_options === 'string' ? JSON.parse(definition.select_options) as unknown : definition.select_options)
        : null,
    };
  }

  // List custom field definitions, optionally filtered by entity_type
  async findAllDefinitions(trx: Knex.Transaction, filters: { entity_type?: string }) {
    const query = trx('custom_field_definitions')
      .select('*')
      .orderBy('entity_type', 'asc')
      .orderBy('sort_order', 'asc')
      .orderBy('field_label', 'asc');

    if (filters.entity_type) void query.where('entity_type', filters.entity_type);

    const rows = await query as Record<string, unknown>[];
    return rows.map((r) => ({
      ...r,
      select_options: r.select_options
        ? (typeof r.select_options === 'string' ? JSON.parse(r.select_options) as unknown : r.select_options)
        : null,
    }));
  }

  // Get single custom field definition
  async findOneDefinition(trx: Knex.Transaction, id: number) {
    const definition = await trx('custom_field_definitions').where({ id }).first() as Record<string, unknown> | undefined;
    if (!definition) return null;
    return {
      ...definition,
      select_options: definition.select_options
        ? (typeof definition.select_options === 'string' ? JSON.parse(definition.select_options) as unknown : definition.select_options)
        : null,
    };
  }

  // Update a custom field definition
  async updateDefinition(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const definition = await trx('custom_field_definitions').where({ id }).first() as Record<string, unknown> | undefined;
    if (!definition) throw new NotFoundException('Custom field definition not found');

    const updates: Record<string, unknown> = {};
    const allowedFields = ['field_name', 'field_label', 'field_type', 'select_options', 'is_required', 'sort_order', 'is_active'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates[field] = field === 'select_options' && data[field] ? JSON.stringify(data[field]) : data[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('custom_field_definitions').where({ id }).update(updates);
    }

    return this.findOneDefinition(trx, id);
  }

  // Delete a custom field definition and its values
  async deleteDefinition(trx: Knex.Transaction, id: number) {
    const definition = await trx('custom_field_definitions').where({ id }).first() as Record<string, unknown> | undefined;
    if (!definition) throw new NotFoundException('Custom field definition not found');

    await trx('custom_field_values').where({ definition_id: id }).del();
    await trx('custom_field_definitions').where({ id }).del();
    return { deleted: true };
  }

  // Get all custom field values for a specific entity
  async getFieldValues(trx: Knex.Transaction, entityType: string, entityId: number) {
    const definitions = await trx('custom_field_definitions')
      .where({ entity_type: entityType, is_active: true })
      .orderBy('sort_order', 'asc')
      .select('*') as Record<string, unknown>[];

    const values = await trx('custom_field_values')
      .where({ entity_type: entityType, entity_id: entityId })
      .select('*') as Record<string, unknown>[];

    const valueMap = new Map<number, Record<string, unknown>>();
    for (const v of values) {
      valueMap.set(Number(v.definition_id), v);
    }

    return definitions.map((def) => {
      const val = valueMap.get(Number(def.id));
      return {
        definition_id: def.id,
        field_name: def.field_name,
        field_label: def.field_label,
        field_type: def.field_type,
        is_required: def.is_required,
        select_options: def.select_options
          ? (typeof def.select_options === 'string' ? JSON.parse(def.select_options) as unknown : def.select_options)
          : null,
        value: val ? val.value : null,
        value_id: val ? val.id : null,
      };
    });
  }

  // Upsert custom field values for a specific entity
  async setFieldValues(trx: Knex.Transaction, tenantId: number, entityType: string, entityId: number, values: { definition_id: number; value: string | number | boolean | null }[]) {
    const results: Record<string, unknown>[] = [];

    for (const item of values) {
      // Verify the definition exists and belongs to the right entity type
      const definition = await trx('custom_field_definitions')
        .where({ id: item.definition_id, entity_type: entityType })
        .first() as Record<string, unknown> | undefined;

      if (!definition) {
        throw new BadRequestException(`Custom field definition ${item.definition_id} not found for entity type '${entityType}'`);
      }

      const valueStr = item.value === null ? null : String(item.value);

      // Check if value already exists
      const existing = await trx('custom_field_values')
        .where({ definition_id: item.definition_id, entity_type: entityType, entity_id: entityId })
        .first() as Record<string, unknown> | undefined;

      if (existing) {
        // Update existing value
        const [updated] = await trx('custom_field_values')
          .where({ id: existing.id })
          .update({ value: valueStr })
          .returning('*') as Record<string, unknown>[];
        results.push(updated);
      } else {
        // Insert new value
        const [inserted] = await trx('custom_field_values').insert({
          tenant_id: tenantId,
          definition_id: item.definition_id,
          entity_type: entityType,
          entity_id: entityId,
          value: valueStr,
        }).returning('*') as Record<string, unknown>[];
        results.push(inserted);
      }
    }

    return results;
  }
}
