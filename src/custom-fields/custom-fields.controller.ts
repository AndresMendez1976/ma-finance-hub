// Custom fields controller — CRUD definitions, get/set values for entities
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class CustomFieldsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: CustomFieldsService,
    private readonly audit: AuditService,
  ) {}

  // ─── Definitions ───

  // List custom field definitions
  @Get('custom-field-definitions')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'entity_type', required: false })
  async findAllDefinitions(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('entity_type') entity_type?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllDefinitions(trx, { entity_type }),
    );
  }

  // Get single definition
  @Get('custom-field-definitions/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneDefinition(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const definition = await this.service.findOneDefinition(trx, id);
      if (!definition) throw new NotFoundException();
      return definition;
    });
  }

  // Create custom field definition
  @Post('custom-field-definitions')
  @Roles('owner', 'admin', 'manager')
  async createDefinition(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const definition = await this.service.createDefinition(trx, p.tenantId, dto) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'custom_field_definitions',
        entity_id: String(definition.id),
        metadata: { field_name: String(definition.field_name), entity_type: String(definition.entity_type) },
      });
      return definition;
    });
  }

  // Update custom field definition
  @Put('custom-field-definitions/:id')
  @Roles('owner', 'admin', 'manager')
  async updateDefinition(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateCustomFieldDto> & { is_active?: boolean },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const definition = await this.service.updateDefinition(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'custom_field_definitions',
        entity_id: String(id),
      });
      return definition;
    });
  }

  // Delete custom field definition
  @Delete('custom-field-definitions/:id')
  @Roles('owner', 'admin')
  async deleteDefinition(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteDefinition(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'custom_field_definitions',
        entity_id: String(id),
      });
      return result;
    });
  }

  // ─── Values ───

  // Get custom field values for an entity
  @Get('custom-field-values/:entityType/:entityId')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async getFieldValues(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getFieldValues(trx, entityType, entityId),
    );
  }

  // Set custom field values for an entity
  @Put('custom-field-values/:entityType/:entityId')
  @Roles('owner', 'admin', 'manager')
  async setFieldValues(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
    @Body() dto: { values: { definition_id: number; value: string | number | boolean | null }[] },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const results = await this.service.setFieldValues(trx, p.tenantId, entityType, entityId, dto.values);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'set_values',
        entity: 'custom_field_values',
        entity_id: `${entityType}:${String(entityId)}`,
        metadata: { count: String(dto.values.length) },
      });
      return results;
    });
  }
}
