import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class AccountsService {
  async findAll(trx: Knex.Transaction, chartId?: number) {
    const query = trx('accounts').select('*');
    if (chartId) query.where({ chart_id: chartId });
    return query;
  }

  async findOne(trx: Knex.Transaction, id: number) {
    return trx('accounts').where({ id }).first();
  }

  async create(trx: Knex.Transaction, data: {
    tenant_id: number;
    chart_id: number;
    account_code: string;
    name: string;
    account_type: string;
    parent_account_id?: number;
  }) {
    const [row] = await trx('accounts').insert(data).returning('*');
    return row;
  }

  async update(trx: Knex.Transaction, id: number, data: {
    name?: string;
    is_active?: boolean;
    parent_account_id?: number | null;
  }) {
    const [row] = await trx('accounts').where({ id }).update(data).returning('*');
    return row;
  }
}
