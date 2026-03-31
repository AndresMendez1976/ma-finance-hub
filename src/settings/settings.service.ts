import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

const DEFAULTS: Record<string, unknown> = {
  company_name: null,
  company_email: null,
  company_phone: null,
  company_address_line1: null,
  company_address_line2: null,
  company_city: null,
  company_state: null,
  company_zip: null,
  company_country: null,
  tax_id: null,
  fiscal_year_start_month: 1,
  default_currency: 'USD',
  invoice_prefix: 'INV-',
  invoice_next_number: 1,
  expense_prefix: 'EXP-',
  expense_next_number: 1,
};

@Injectable()
export class SettingsService {
  async getSettings(trx: Knex.Transaction, tenantId: number): Promise<Record<string, unknown>> {
    const existing = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .first() as Record<string, unknown> | undefined;

    if (existing) return existing;

    const [row] = await trx('tenant_settings')
      .insert({ tenant_id: tenantId, ...DEFAULTS })
      .returning('*') as Record<string, unknown>[];
    return row;
  }

  async updateSettings(
    trx: Knex.Transaction,
    tenantId: number,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Filter out undefined values so we only update provided fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    const [row] = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .update(updates)
      .returning('*') as Record<string, unknown>[];
    return row;
  }
}
