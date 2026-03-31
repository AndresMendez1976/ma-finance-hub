import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Knex } from 'knex';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { KNEX_CONNECTION } from '../database';
import { EntitlementService } from '../entitlements';

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    private readonly entitlements: EntitlementService,
  ) {}

  async create(
    trx: Knex.Transaction,
    tenantId: number,
    _inviterSub: string,
    data: {
      email: string;
      role: string;
      user_type: string;
      external_type?: string;
      permissions?: Record<string, boolean>;
      message?: string;
      expires_in_days?: number;
    },
  ): Promise<Record<string, unknown>> {
    // Resolve inviter user ID
    const inviter = await trx('users')
      .whereRaw("external_subject = current_setting('app.current_subject', true)")
      .select('id', 'display_name')
      .first() as Record<string, unknown> | undefined;
    if (!inviter) throw new BadRequestException('Inviter not found');

    // Check tier user limit
    const userLimit = await this.entitlements.getLimit(tenantId, 'limit.max_users');
    if (userLimit !== null) {
      const countResult = await trx('tenant_memberships')
        .where({ is_active: true })
        .count('id as count')
        .first() as Record<string, unknown> | undefined;
      const currentUsers = Number(countResult?.count ?? 0);
      const pendingResult = await trx('invitations')
        .where({ status: 'pending' })
        .count('id as count')
        .first() as Record<string, unknown> | undefined;
      const pendingInvites = Number(pendingResult?.count ?? 0);
      if (currentUsers + pendingInvites >= userLimit) {
        throw new BadRequestException(`User limit (${userLimit}) reached for your tier. Upgrade to invite more users.`);
      }
    }

    // Check if there's already a pending invitation for this email
    const existing = await trx('invitations')
      .where({ email: data.email.toLowerCase(), status: 'pending' })
      .first() as Record<string, unknown> | undefined;
    if (existing) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    const token = crypto.randomUUID();
    const expiresInDays = data.expires_in_days ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const [row] = await trx('invitations').insert({
      tenant_id: tenantId,
      email: data.email.toLowerCase(),
      role: data.role,
      user_type: data.user_type,
      external_type: data.external_type || null,
      permissions: data.permissions ? JSON.stringify(data.permissions) : null,
      invited_by: inviter.id,
      token,
      status: 'pending',
      expires_at: expiresAt,
      message: data.message || null,
    }).returning('*') as Record<string, unknown>[];

    return row;
  }

  async findAll(trx: Knex.Transaction, filters: { status?: string }): Promise<Record<string, unknown>[]> {
    const query = trx('invitations as i')
      .leftJoin('users as u', 'u.id', 'i.invited_by')
      .select(
        'i.id', 'i.email', 'i.role', 'i.user_type', 'i.external_type',
        'i.status', 'i.expires_at', 'i.accepted_at', 'i.message', 'i.created_at',
        'u.display_name as inviter_name',
      )
      .orderBy('i.created_at', 'desc');

    if (filters.status) {
      void query.where('i.status', filters.status);
    }

    return await query as Record<string, unknown>[];
  }

  async revoke(trx: Knex.Transaction, id: number): Promise<Record<string, unknown>> {
    const invitation = await trx('invitations').where({ id }).first() as Record<string, unknown> | undefined;
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'pending') throw new BadRequestException('Only pending invitations can be revoked');

    const [updated] = await trx('invitations')
      .where({ id })
      .update({ status: 'revoked' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  async getInviteInfo(token: string): Promise<Record<string, unknown>> {
    // Public lookup — bypass RLS by using the main db connection
    const invitation = await this.db('invitations as i')
      .join('tenants as t', 't.id', 'i.tenant_id')
      .leftJoin('users as u', 'u.id', 'i.invited_by')
      .leftJoin('tenant_settings as ts', 'ts.tenant_id', 'i.tenant_id')
      .where('i.token', token)
      .select(
        'i.email', 'i.role', 'i.user_type', 'i.external_type',
        'i.status', 'i.expires_at', 'i.message',
        't.name as tenant_name',
        'ts.company_name',
        'u.display_name as inviter_name',
      )
      .first() as Record<string, unknown> | undefined;

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'pending') throw new BadRequestException('This invitation is no longer valid');
    if (new Date(String(invitation.expires_at)) < new Date()) throw new BadRequestException('This invitation has expired');

    return {
      email: invitation.email,
      role: invitation.role,
      user_type: invitation.user_type,
      external_type: invitation.external_type,
      company_name: invitation.company_name || invitation.tenant_name,
      inviter_name: invitation.inviter_name,
      message: invitation.message,
    };
  }

  async accept(
    token: string,
    data: { first_name: string; last_name: string; password: string },
  ): Promise<{ message: string }> {
    // Public operation — use main db (no RLS)
    return this.db.transaction(async (trx) => {
      const invitation = await trx('invitations')
        .where({ token, status: 'pending' })
        .first() as Record<string, unknown> | undefined;

      if (!invitation) throw new NotFoundException('Invitation not found or already used');
      if (new Date(String(invitation.expires_at)) < new Date()) {
        await trx('invitations').where({ id: invitation.id as number }).update({ status: 'expired' });
        throw new BadRequestException('This invitation has expired');
      }

      // Check if email already exists as a user
      const existingUser = await trx('users').where({ email: String(invitation.email) }).first() as Record<string, unknown> | undefined;
      if (existingUser) {
        // User exists — just add membership
        const existingMembership = await trx('tenant_memberships')
          .where({ tenant_id: invitation.tenant_id as number, user_id: existingUser.id as number })
          .first() as Record<string, unknown> | undefined;

        if (existingMembership) {
          throw new ConflictException('User is already a member of this organization');
        }

        await trx('tenant_memberships').insert({
          tenant_id: invitation.tenant_id,
          user_id: existingUser.id,
          role: invitation.role,
          is_active: true,
        });

        await trx('invitations').where({ id: invitation.id as number }).update({
          status: 'accepted',
          accepted_at: new Date(),
          accepted_by_user_id: existingUser.id,
        });

        return { message: 'Invitation accepted. You can now log in.' };
      }

      // Create new user
      const displayName = `${data.first_name} ${data.last_name}`;
      const externalSubject = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(data.password, 12);

      const [user] = await trx('users').insert({
        external_subject: externalSubject,
        email: invitation.email,
        display_name: displayName,
        password_hash: passwordHash,
        is_active: true,
        user_type: invitation.user_type,
        external_type: invitation.external_type || null,
        invited_by: invitation.invited_by,
      }).returning('*') as Record<string, unknown>[];

      // Create membership
      await trx('tenant_memberships').insert({
        tenant_id: invitation.tenant_id,
        user_id: user.id,
        role: invitation.role,
        is_active: true,
      });

      // Update invitation
      await trx('invitations').where({ id: invitation.id as number }).update({
        status: 'accepted',
        accepted_at: new Date(),
        accepted_by_user_id: user.id,
      });

      // Audit log
      await trx('audit_log').insert({
        tenant_id: invitation.tenant_id,
        actor_subject: externalSubject,
        action: 'invitation_accepted',
        entity: 'users',
        entity_id: String(user.id),
        metadata: JSON.stringify({ email: invitation.email, role: invitation.role }),
      });

      return { message: 'Account created successfully. You can now log in.' };
    });
  }

  async getExternalUsers(trx: Knex.Transaction): Promise<Record<string, unknown>[]> {
    return await trx('users as u')
      .join('tenant_memberships as tm', function () {
        this.on('tm.user_id', 'u.id');
      })
      .where('u.user_type', 'external')
      .select(
        'u.id', 'u.display_name', 'u.email', 'u.external_type',
        'u.is_active', 'u.can_export_data', 'u.access_expires_at',
        'u.last_activity_at', 'u.created_at',
        'tm.role', 'tm.is_active as membership_active',
      ) as Record<string, unknown>[];
  }

  async updateAccess(
    trx: Knex.Transaction,
    userId: number,
    data: { permissions?: Record<string, boolean>; access_expires_at?: string | null; can_export_data?: boolean },
  ): Promise<Record<string, unknown>> {
    const user = await trx('users').where({ id: userId }).first() as Record<string, unknown> | undefined;
    if (!user) throw new NotFoundException('User not found');

    const updates: Record<string, unknown> = {};
    if (data.can_export_data !== undefined) updates.can_export_data = data.can_export_data;
    if (data.access_expires_at !== undefined) updates.access_expires_at = data.access_expires_at;

    if (Object.keys(updates).length > 0) {
      await trx('users').where({ id: userId }).update(updates);
    }

    return (await trx('users').where({ id: userId }).first()) as Record<string, unknown>;
  }

  async revokeAccess(trx: Knex.Transaction, userId: number): Promise<{ revoked: true }> {
    const user = await trx('users').where({ id: userId }).first() as Record<string, unknown> | undefined;
    if (!user) throw new NotFoundException('User not found');

    await trx('users').where({ id: userId }).update({ is_active: false });
    await trx('tenant_memberships').where({ user_id: userId }).update({ is_active: false });

    return { revoked: true };
  }
}
