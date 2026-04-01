// Document Templates controller — CRUD + preview
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { DocumentTemplatesService } from './document-templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';

@ApiTags('Document Templates')
@ApiBearerAuth()
@Controller('document-templates')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class DocumentTemplatesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: DocumentTemplatesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'document_type', required: false })
  @ApiOperation({ summary: 'List document templates' })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('document_type') documentType?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, { document_type: documentType }),
    );
  }

  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get a document template' })
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findOne(trx, id),
    );
  }

  @Get(':id/preview')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Preview a document template (returns template data)' })
  async preview(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const template = await this.service.findOne(trx, id);
      // Return template with sample data for frontend preview rendering
      return {
        template,
        sample: {
          invoice_number: 'INV-0001',
          customer_name: 'Sample Customer',
          customer_email: 'customer@example.com',
          customer_address: '123 Main St\nNew York, NY 10001',
          issue_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          subtotal: 1500.00,
          tax_rate: 8.25,
          tax_amount: 123.75,
          total: 1623.75,
          lines: [
            { description: 'Web Development Services', quantity: 10, unit_price: 100.00, amount: 1000.00 },
            { description: 'Design Consultation', quantity: 5, unit_price: 100.00, amount: 500.00 },
          ],
        },
      };
    });
  }

  @Post()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a document template' })
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const template = await this.service.create(trx, { tenant_id: p.tenantId, ...dto });
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'document_templates',
        entity_id: String(template.id),
        metadata: { document_type: dto.document_type, name: dto.name },
      });
      return template;
    });
  }

  @Put(':id')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update a document template' })
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const template = await this.service.update(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'document_templates',
        entity_id: String(id),
      });
      return template;
    });
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete a document template' })
  async remove(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.remove(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'document_templates',
        entity_id: String(id),
      });
      return result;
    });
  }
}
