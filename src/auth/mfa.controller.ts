// MFA Controller — setup, verify, disable, validate during login
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IdentityGuard } from './identity.guard';
import { CurrentPrincipal } from './decorators';
import { AuthenticatedPrincipal } from './interfaces';
import { MfaService } from './mfa.service';
import { AuditService } from './audit.service';
import { TenantContextService } from './tenant-context.service';

class MfaTokenDto {
  @IsString() token!: string;
}

class MfaDisableDto {
  @IsString() token!: string;
  @IsString() password!: string;
}

@ApiTags('Auth - MFA')
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly audit: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // Setup MFA — generate secret + QR code (requires auth)
  @Post('setup')
  @UseGuards(JwtAuthGuard, IdentityGuard)
  @ApiBearerAuth()
  async setup(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    const result = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const user = await trx('users').where({ external_subject: p.sub }).select('id', 'email').first() as Record<string, unknown> | undefined;
      if (!user) throw new Error('User not found');
      return this.mfaService.setup(Number(user.id), String(user.email ?? p.sub));
    });
    return result;
  }

  // Verify setup — confirm with first TOTP token
  @Post('verify-setup')
  @UseGuards(JwtAuthGuard, IdentityGuard)
  @ApiBearerAuth()
  async verifySetup(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: MfaTokenDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const user = await trx('users').where({ external_subject: p.sub }).select('id').first() as Record<string, unknown> | undefined;
      if (!user) throw new Error('User not found');
      await this.mfaService.verifySetup(Number(user.id), dto.token);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'mfa_enabled',
        entity: 'users',
        entity_id: String(user.id),
      });
      return { success: true, message: 'MFA enabled successfully' };
    });
  }

  // Disable MFA — requires current TOTP + password
  @Post('disable')
  @UseGuards(JwtAuthGuard, IdentityGuard)
  @ApiBearerAuth()
  async disable(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: MfaDisableDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const user = await trx('users').where({ external_subject: p.sub }).select('id').first() as Record<string, unknown> | undefined;
      if (!user) throw new Error('User not found');
      await this.mfaService.disable(Number(user.id), dto.token, dto.password);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'mfa_disabled',
        entity: 'users',
        entity_id: String(user.id),
      });
      return { success: true, message: 'MFA disabled' };
    });
  }
}
