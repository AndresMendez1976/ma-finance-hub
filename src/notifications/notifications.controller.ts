// Notifications controller — list, unread count, mark read
import { Controller, Get, Post, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class NotificationsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: NotificationService,
  ) {}

  @Get()
  @ApiQuery({ name: 'is_read', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('is_read') isRead?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const user = await trx('users').where({ external_subject: p.sub }).select('id').first() as Record<string, unknown> | undefined;
      if (!user) return { data: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 } };
      return this.service.findAll(trx, Number(user.id), {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        is_read: isRead !== undefined ? isRead === 'true' : undefined,
      });
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const user = await trx('users').where({ external_subject: p.sub }).select('id').first() as Record<string, unknown> | undefined;
      if (!user) return { count: 0 };
      const count = await this.service.getUnreadCount(trx, Number(user.id));
      return { count };
    });
  }

  @Post(':id/read')
  async markRead(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.markRead(trx, id),
    );
  }

  @Post('read-all')
  async markAllRead(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const user = await trx('users').where({ external_subject: p.sub }).select('id').first() as Record<string, unknown> | undefined;
      if (!user) return { marked_read: 0 };
      return this.service.markAllRead(trx, Number(user.id));
    });
  }
}
