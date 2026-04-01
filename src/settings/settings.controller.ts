import { Controller, Get, Put, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UploadLogoDto } from './dto/upload-logo.dto';
import { UpdateInvoiceTemplateDto } from './dto/update-invoice-template.dto';
import { UpdateStripeDto } from './dto/update-stripe.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
export class SettingsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst')
  async getSettings(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getSettings(trx, p.tenantId),
    );
  }

  @Put()
  @Roles('owner', 'admin')
  async updateSettings(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      // Ensure settings row exists before updating
      await this.service.getSettings(trx, p.tenantId);
      const row: Record<string, unknown> = await this.service.updateSettings(trx, p.tenantId, dto as Record<string, unknown>);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'tenant_settings',
        metadata: dto as object,
      });
      return row;
    });
  }

  // ── Logo ──

  @Post('logo')
  @Roles('owner', 'admin')
  async uploadLogo(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: UploadLogoDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      await this.service.getSettings(trx, p.tenantId);
      const row = await this.service.uploadLogo(trx, p.tenantId, dto.logo_base64);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'upload_logo',
        entity: 'tenant_settings',
      });
      return row;
    });
  }

  @Delete('logo')
  @Roles('owner', 'admin')
  async deleteLogo(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      await this.service.getSettings(trx, p.tenantId);
      const row = await this.service.deleteLogo(trx, p.tenantId);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete_logo',
        entity: 'tenant_settings',
      });
      return row;
    });
  }

  // ── Invoice Template ──

  @Put('invoice-template')
  @Roles('owner', 'admin')
  async updateInvoiceTemplate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: UpdateInvoiceTemplateDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      await this.service.getSettings(trx, p.tenantId);
      const row = await this.service.updateInvoiceSettings(trx, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update_invoice_template',
        entity: 'tenant_settings',
        metadata: dto as object,
      });
      return row;
    });
  }

  // ── Stripe ──

  @Put('stripe')
  @Roles('owner')
  async updateStripe(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: UpdateStripeDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      await this.service.getSettings(trx, p.tenantId);
      const row = await this.service.updateStripeSettings(trx, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update_stripe_settings',
        entity: 'tenant_settings',
        // Do not log secret keys in audit
        metadata: {
          payment_enabled: dto.payment_enabled,
          publishable_key_set: !!dto.stripe_publishable_key,
          secret_key_set: !!dto.stripe_secret_key,
          webhook_secret_set: !!dto.stripe_webhook_secret,
        },
      });
      return row;
    });
  }
}
