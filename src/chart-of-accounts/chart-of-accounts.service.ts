import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class ChartOfAccountsService {
  async findAll(trx: Knex.Transaction) {
    return trx('chart_of_accounts').select('id', 'tenant_id', 'name', 'description', 'is_active', 'created_at', 'updated_at');
  }

  async findOne(trx: Knex.Transaction, id: number) {
    return trx('chart_of_accounts').where({ id }).first();
  }

  async create(trx: Knex.Transaction, data: { tenant_id: number; name: string; description?: string }) {
    const [row] = await trx('chart_of_accounts').insert(data).returning('*');
    return row;
  }

  async update(trx: Knex.Transaction, id: number, data: { name?: string; description?: string; is_active?: boolean }) {
    const [row] = await trx('chart_of_accounts').where({ id }).update(data).returning('*');
    return row;
  }
}
