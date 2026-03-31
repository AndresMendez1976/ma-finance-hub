import { Injectable, ForbiddenException } from '@nestjs/common';
import { Knex } from 'knex';
import { ResolvedIdentity } from './interfaces';

@Injectable()
export class MembershipService {
  async resolveIdentity(trx: Knex.Transaction): Promise<ResolvedIdentity> {
    // Explicitly filter by current subject to avoid picking up other tenant members
    // visible through the user_tenant_member_select RLS policy.
    const user = await trx('users')
      .whereRaw("external_subject = current_setting('app.current_subject', true)")
      .select('id', 'external_subject', 'display_name', 'email')
      .first() as Record<string, unknown> | undefined;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const membership = await trx('tenant_memberships')
      .where({ user_id: user.id as number })
      .select('id', 'role', 'is_active')
      .first() as Record<string, unknown> | undefined;

    if (!membership) {
      throw new ForbiddenException('No membership for this tenant');
    }

    if (!membership.is_active) {
      throw new ForbiddenException('Membership is inactive');
    }

    return {
      user: {
        id: String(user.id),
        externalSubject: String(user.external_subject),
        displayName: String(user.display_name),
        email: user.email != null ? String(user.email) : null,
      },
      membership: {
        id: String(membership.id),
        role: String(membership.role),
        isActive: Boolean(membership.is_active),
      },
    };
  }
}
