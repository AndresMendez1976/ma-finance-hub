import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class AdminService {
  async listUsers(trx: Knex.Transaction, tenantId: number) {
    return trx('tenant_memberships as tm')
      .join('users as u', 'u.id', 'tm.user_id')
      .where('tm.tenant_id', tenantId)
      .select(
        'u.id as user_id',
        'u.external_subject',
        'u.display_name',
        'u.email',
        'u.is_active as user_is_active',
        'tm.id as membership_id',
        'tm.role',
        'tm.is_active as membership_is_active',
      );
  }

  async createUser(trx: Knex.Transaction, data: {
    external_subject: string;
    display_name: string;
    email?: string;
  }) {
    const existing = await trx('users').where({ external_subject: data.external_subject }).first();
    if (existing) throw new ConflictException('User with this external_subject already exists');
    const [user] = await trx('users').insert(data).returning('*');
    return user;
  }

  async createMembership(trx: Knex.Transaction, data: {
    tenant_id: number;
    user_id: number;
    role: string;
  }) {
    // Skip user existence check via RLS — the FK constraint on user_id will
    // reject invalid user IDs. Users table RLS restricts SELECT to own record only.
    const existing = await trx('tenant_memberships')
      .where({ tenant_id: data.tenant_id, user_id: data.user_id })
      .first();
    if (existing) throw new ConflictException('Membership already exists');
    const [membership] = await trx('tenant_memberships').insert(data).returning('*');
    return membership;
  }

  async updateMembership(trx: Knex.Transaction, membershipId: number, data: {
    role?: string;
    is_active?: boolean;
  }) {
    const [row] = await trx('tenant_memberships').where({ id: membershipId }).update(data).returning('*');
    if (!row) throw new NotFoundException('Membership not found');
    return row;
  }
}
