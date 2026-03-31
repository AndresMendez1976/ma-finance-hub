// API Keys service — create, list, revoke, validate API keys
import { Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  // Generate a random API key prefix + secret
  private generateKey(): { key: string; prefix: string; hash: string } {
    const prefix = `mfh_${crypto.randomBytes(4).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const key = `${prefix}_${secret}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return { key, prefix, hash };
  }

  // Hash a key for lookup
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  // Create a new API key — returns the key only once
  async create(trx: Knex.Transaction, tenantId: number, name: string, permissions: string[]) {
    const { key, prefix, hash } = this.generateKey();

    const [row] = await trx('api_keys').insert({
      tenant_id: tenantId,
      name,
      key_prefix: prefix,
      key_hash: hash,
      permissions: JSON.stringify(permissions),
      is_active: true,
      last_used_at: null,
    }).returning('*') as Record<string, unknown>[];

    // Return the key only this one time — it cannot be retrieved again
    return {
      id: row.id,
      name: row.name,
      key_prefix: row.key_prefix,
      key,
      permissions,
      is_active: row.is_active,
      created_at: row.created_at,
    };
  }

  // List API keys (without the key itself)
  async findAll(trx: Knex.Transaction) {
    const rows = await trx('api_keys')
      .select('id', 'name', 'key_prefix', 'permissions', 'is_active', 'last_used_at', 'created_at')
      .orderBy('created_at', 'desc') as Record<string, unknown>[];

    return rows.map((r) => ({
      ...r,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) as unknown : r.permissions,
    }));
  }

  // Revoke an API key
  async revoke(trx: Knex.Transaction, id: number) {
    const existing = await trx('api_keys').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('API key not found');

    await trx('api_keys').where({ id }).update({ is_active: false });
    return { revoked: true, id };
  }

  // Validate an API key — hash and lookup, returns key record or null
  async validateKey(trx: Knex.Transaction, key: string): Promise<Record<string, unknown> | null> {
    const hash = this.hashKey(key);

    const row = await trx('api_keys')
      .where({ key_hash: hash, is_active: true })
      .first() as Record<string, unknown> | undefined;

    if (!row) return null;

    // Update last_used_at
    await trx('api_keys').where({ id: row.id }).update({ last_used_at: new Date() });

    return {
      ...row,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) as unknown : row.permissions,
    };
  }
}
