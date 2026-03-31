import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class AccountsService {
  async findAll(trx: Knex.Transaction, chartId?: number): Promise<Record<string, unknown>[]> {
    const query = trx('accounts').select('*');
    if (chartId) await query.where({ chart_id: chartId });
    return await query as Record<string, unknown>[];
  }

  async findOne(trx: Knex.Transaction, id: number): Promise<Record<string, unknown> | undefined> {
    return await trx('accounts').where({ id }).first() as Record<string, unknown> | undefined;
  }

  async create(trx: Knex.Transaction, data: {
    tenant_id: number;
    chart_id: number;
    account_code: string;
    name: string;
    account_type: string;
    parent_account_id?: number;
  }): Promise<Record<string, unknown>> {
    const [row] = await trx('accounts').insert(data).returning('*') as Record<string, unknown>[];
    return row;
  }

  async update(trx: Knex.Transaction, id: number, data: {
    name?: string;
    is_active?: boolean;
    parent_account_id?: number | null;
  }): Promise<Record<string, unknown> | undefined> {
    const [row] = await trx('accounts').where({ id }).update(data).returning('*') as Record<string, unknown>[];
    return row;
  }
}
