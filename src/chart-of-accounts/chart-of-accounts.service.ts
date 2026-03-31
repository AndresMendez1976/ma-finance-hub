import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class ChartOfAccountsService {
  async findAll(trx: Knex.Transaction): Promise<Record<string, unknown>[]> {
    return await trx('chart_of_accounts').select('id', 'tenant_id', 'name', 'description', 'is_active', 'created_at', 'updated_at') as Record<string, unknown>[];
  }

  async findOne(trx: Knex.Transaction, id: number): Promise<Record<string, unknown> | undefined> {
    return await trx('chart_of_accounts').where({ id }).first() as Record<string, unknown> | undefined;
  }

  async create(trx: Knex.Transaction, data: { tenant_id: number; name: string; description?: string }): Promise<Record<string, unknown>> {
    const [row] = await trx('chart_of_accounts').insert(data).returning('*') as Record<string, unknown>[];
    return row;
  }

  async update(trx: Knex.Transaction, id: number, data: { name?: string; description?: string; is_active?: boolean }): Promise<Record<string, unknown> | undefined> {
    const [row] = await trx('chart_of_accounts').where({ id }).update(data).returning('*') as Record<string, unknown>[];
    return row;
  }
}
