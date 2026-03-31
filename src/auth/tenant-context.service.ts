import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database';

@Injectable()
export class TenantContextService {
  constructor(@Inject(KNEX_CONNECTION) private readonly db: Knex) {}

  /**
   * Runs a callback within a transaction that has SET LOCAL for both
   * app.current_tenant_id and app.current_subject.
   * SET LOCAL is scoped to the transaction — it does not leak to other
   * connections in the pool. When the transaction ends, the settings are gone.
   *
   * Uses set_config() with parameterized values to avoid string interpolation.
   */
  async runInTenantContext<T>(
    tenantId: number,
    subject: string,
    callback: (trx: Knex.Transaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (trx) => {
      await trx.raw("SELECT set_config('app.current_tenant_id', ?, true)", [
        String(tenantId),
      ]);
      await trx.raw("SELECT set_config('app.current_subject', ?, true)", [
        subject,
      ]);
      return callback(trx);
    });
  }
}
