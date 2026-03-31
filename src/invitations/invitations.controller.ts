import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { validatePasswordPolicy } from '../auth/password-policy';

class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(128)
  password!: string;
}

class UpdateAccessDto {
  @IsOptional()
  @IsBoolean()
  can_export_data?: boolean;

  @IsOptional()
  @IsString()
  access_expires_at?: string | null;
}

@ApiTags('Invitations')
@Controller()
export class InvitationsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: InvitationsService,
    private readonly audit: AuditService,
  ) {}

  // ── Internal (JWT required) ──────────────────────────────────────

  @Post('invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
  @Roles('owner', 'admin')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invitation = await this.service.create(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'invitation_created',
        entity: 'invitations',
        entity_id: String(invitation.id),
        metadata: { email: dto.email, role: dto.role },
      });
      return invitation;
    });
  }

  @Get('invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, { status }),
    );
  }

  @Delete('invitations/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
  @Roles('owner', 'admin')
  async revoke(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.revoke(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'invitation_revoked',
        entity: 'invitations',
        entity_id: String(id),
      });
      return result;
    });
  }

  // ── Public (no JWT) ──────────────────────────────────────────────

  @Get('invitations/:token/info')
  async getInviteInfo(@Param('token') token: string) {
    return this.service.getInviteInfo(token);
  }

  @Post('invitations/:token/accept')
  async acceptInvite(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    const policyError = validatePasswordPolicy(dto.password);
    if (policyError) {
      throw new BadRequestException(policyError);
    }
    return this.service.accept(token, dto);
  }

  // ── External user management (JWT required) ──────────────────────

  @Get('users/external')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
  async getExternalUsers(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getExternalUsers(trx),
    );
  }

  @Put('users/:id/access')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
  @Roles('owner', 'admin')
  async updateAccess(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccessDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.updateAccess(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update_access',
        entity: 'users',
        entity_id: String(id),
      });
      return result;
    });
  }

  @Post('users/:id/revoke-access')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
  @Roles('owner', 'admin')
  async revokeAccess(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.revokeAccess(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'revoke_access',
        entity: 'users',
        entity_id: String(id),
      });
      return result;
    });
  }
}
