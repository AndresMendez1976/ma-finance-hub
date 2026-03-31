import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class AuditService {
  async log(
    trx: Knex.Transaction,
    data: {
      tenant_id: number | null;
      actor_subject: string;
      action: string;
      entity: string;
      entity_id?: string;
      metadata?: object;
    },
  ) {
    await trx('audit_log').insert({
      tenant_id: data.tenant_id,
      actor_subject: data.actor_subject,
      action: data.action,
      entity: data.entity,
      entity_id: data.entity_id ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  }
}
