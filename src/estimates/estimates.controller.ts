// Estimates controller — CRUD, lifecycle, conversion to invoice, PDF generation
import { Controller, Get, Post, Put, Delete, Param, Body, Query, Res, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';

@ApiTags('Estimates')
@ApiBearerAuth()
@Controller('estimates')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class EstimatesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: EstimatesService,
    private readonly audit: AuditService,
  ) {}

  // Create new draft estimate
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateEstimateDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const estimate = await this.service.create(trx, p.tenantId, p.sub, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      }) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'estimates',
        entity_id: String(estimate.id),
        metadata: { estimate_number: String(estimate.estimate_number) },
      });
      return estimate;
    });
  }

  // List estimates with optional filters
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Get single estimate with lines
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const estimate = await this.service.findOne(trx, id);
      if (!estimate) throw new NotFoundException();
      return estimate;
    });
  }

  // Update draft or sent estimate
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEstimateDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const estimate = await this.service.update(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'estimates',
        entity_id: String(id),
      });
      return estimate;
    });
  }

  // Send estimate (draft -> sent)
  @Post(':id/send')
  @Roles('owner', 'admin', 'manager')
  async sendEstimate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const estimate = await this.service.send(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'send',
        entity: 'estimates',
        entity_id: String(id),
        metadata: { estimate_number: estimate.estimate_number },
      });
      return estimate;
    });
  }

  // Accept estimate (sent -> accepted)
  @Post(':id/accept')
  @Roles('owner', 'admin', 'manager')
  async acceptEstimate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const estimate = await this.service.accept(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'accept',
        entity: 'estimates',
        entity_id: String(id),
        metadata: { estimate_number: estimate.estimate_number },
      });
      return estimate;
    });
  }

  // Reject estimate (sent -> rejected)
  @Post(':id/reject')
  @Roles('owner', 'admin', 'manager')
  async rejectEstimate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const estimate = await this.service.reject(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'reject',
        entity: 'estimates',
        entity_id: String(id),
        metadata: { estimate_number: estimate.estimate_number },
      });
      return estimate;
    });
  }

  // Convert estimate to invoice
  @Post(':id/convert-to-invoice')
  @Roles('owner', 'admin', 'manager')
  async convertToInvoice(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.convertToInvoice(trx, p.tenantId, id, p.sub) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'convert_to_invoice',
        entity: 'estimates',
        entity_id: String(id),
        metadata: { invoice_id: String(invoice.id), invoice_number: String(invoice.invoice_number) },
      });
      return invoice;
    });
  }

  // Generate and download PDF
  @Get(':id/pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async downloadPdf(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.generatePdf(trx, id),
    );
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'download_pdf',
        entity: 'estimates',
        entity_id: String(id),
      }),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }

  // Delete estimate
  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.delete(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'estimates',
        entity_id: String(id),
      });
      return result;
    });
  }
}
