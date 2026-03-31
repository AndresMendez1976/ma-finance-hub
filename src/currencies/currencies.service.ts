// Currencies service — CRUD currencies and exchange rates
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class CurrenciesService {
  // List all active currencies (global, no tenant filter)
  async getAllCurrencies(trx: Knex.Transaction) {
    const rows = await trx('currencies')
      .select('*')
      .where({ is_active: true })
      .orderBy('code', 'asc') as Record<string, unknown>[];
    return rows;
  }

  // Create a new exchange rate
  async createExchangeRate(trx: Knex.Transaction, tenantId: number, data: {
    from_currency: string; to_currency: string; rate: number; effective_date: string;
  }) {
    if (data.from_currency === data.to_currency) {
      throw new BadRequestException('From and To currencies must be different');
    }

    const [row] = await trx('exchange_rates').insert({
      tenant_id: tenantId,
      from_currency: data.from_currency.toUpperCase(),
      to_currency: data.to_currency.toUpperCase(),
      rate: data.rate,
      effective_date: data.effective_date,
    }).returning('*') as Record<string, unknown>[];
    return row;
  }

  // List exchange rates for a tenant
  async findAllExchangeRates(trx: Knex.Transaction, filters?: {
    from_currency?: string; to_currency?: string; page?: number; limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('exchange_rates').select('*').orderBy('effective_date', 'desc');
    if (filters?.from_currency) void query.where('from_currency', filters.from_currency.toUpperCase());
    if (filters?.to_currency) void query.where('to_currency', filters.to_currency.toUpperCase());

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

  // Get latest exchange rate between two currencies
  async getLatestRate(trx: Knex.Transaction, from: string, to: string) {
    const row = await trx('exchange_rates')
      .where({ from_currency: from.toUpperCase(), to_currency: to.toUpperCase() })
      .orderBy('effective_date', 'desc')
      .first() as Record<string, unknown> | undefined;

    if (!row) throw new NotFoundException(`No exchange rate found for ${from}→${to}`);
    return row;
  }

  // Update an exchange rate
  async updateExchangeRate(trx: Knex.Transaction, id: number, data: {
    from_currency?: string; to_currency?: string; rate?: number; effective_date?: string;
  }) {
    const existing = await trx('exchange_rates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Exchange rate not found');

    const updates: Record<string, unknown> = {};
    if (data.from_currency !== undefined) updates.from_currency = data.from_currency.toUpperCase();
    if (data.to_currency !== undefined) updates.to_currency = data.to_currency.toUpperCase();
    if (data.rate !== undefined) updates.rate = data.rate;
    if (data.effective_date !== undefined) updates.effective_date = data.effective_date;

    if (Object.keys(updates).length > 0) {
      await trx('exchange_rates').where({ id }).update(updates);
    }

    return trx('exchange_rates').where({ id }).first() as Promise<Record<string, unknown>>;
  }

  // Delete an exchange rate
  async deleteExchangeRate(trx: Knex.Transaction, id: number) {
    const existing = await trx('exchange_rates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Exchange rate not found');

    await trx('exchange_rates').where({ id }).delete();
    return { deleted: true, id };
  }
}
