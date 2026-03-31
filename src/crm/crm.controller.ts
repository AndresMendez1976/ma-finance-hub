// CRM controller — pipelines, opportunities, activities, dashboard
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { CrmService } from './crm.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { MoveOpportunityDto } from './dto/move-opportunity.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('CRM')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class CrmController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: CrmService,
    private readonly audit: AuditService,
  ) {}

  // ─── Pipelines ───

  // List pipelines
  @Get('crm/pipelines')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAllPipelines(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllPipelines(trx),
    );
  }

  // Get single pipeline
  @Get('crm/pipelines/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOnePipeline(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const pipeline = await this.service.findOnePipeline(trx, id);
      if (!pipeline) throw new NotFoundException();
      return pipeline;
    });
  }

  // Create pipeline
  @Post('crm/pipelines')
  @Roles('owner', 'admin', 'manager')
  async createPipeline(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreatePipelineDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const pipeline = await this.service.createPipeline(trx, p.tenantId, dto) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'crm_pipelines',
        entity_id: String(pipeline.id),
        metadata: { name: String(pipeline.name) },
      });
      return pipeline;
    });
  }

  // Update pipeline
  @Put('crm/pipelines/:id')
  @Roles('owner', 'admin', 'manager')
  async updatePipeline(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const pipeline = await this.service.updatePipeline(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'crm_pipelines',
        entity_id: String(id),
      });
      return pipeline;
    });
  }

  // Delete pipeline
  @Delete('crm/pipelines/:id')
  @Roles('owner', 'admin')
  async deletePipeline(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deletePipeline(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'crm_pipelines',
        entity_id: String(id),
      });
      return result;
    });
  }

  // ─── Opportunities ───

  // List opportunities
  @Get('crm/opportunities')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'pipeline_id', required: false })
  @ApiQuery({ name: 'stage_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllOpportunities(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('pipeline_id') pipeline_id?: string,
    @Query('stage_id') stage_id?: string,
    @Query('status') status?: string,
    @Query('contact_id') contact_id?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllOpportunities(trx, {
        pipeline_id: pipeline_id ? parseInt(pipeline_id, 10) : undefined,
        stage_id: stage_id ? parseInt(stage_id, 10) : undefined,
        status,
        contact_id: contact_id ? parseInt(contact_id, 10) : undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Get single opportunity
  @Get('crm/opportunities/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneOpportunity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const opp = await this.service.findOneOpportunity(trx, id);
      if (!opp) throw new NotFoundException();
      return opp;
    });
  }

  // Create opportunity
  @Post('crm/opportunities')
  @Roles('owner', 'admin', 'manager')
  async createOpportunity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateOpportunityDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const opp = await this.service.createOpportunity(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'crm_opportunities',
        entity_id: String(opp.id),
        metadata: { name: String(opp.name) },
      });
      return opp;
    });
  }

  // Update opportunity
  @Put('crm/opportunities/:id')
  @Roles('owner', 'admin', 'manager')
  async updateOpportunity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const opp = await this.service.updateOpportunity(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'crm_opportunities',
        entity_id: String(id),
      });
      return opp;
    });
  }

  // Delete opportunity
  @Delete('crm/opportunities/:id')
  @Roles('owner', 'admin')
  async deleteOpportunity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteOpportunity(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'crm_opportunities',
        entity_id: String(id),
      });
      return result;
    });
  }

  // Move opportunity to stage
  @Post('crm/opportunities/:id/move')
  @Roles('owner', 'admin', 'manager')
  async moveOpportunity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveOpportunityDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const opp = await this.service.moveOpportunity(trx, id, dto.stage_id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'move',
        entity: 'crm_opportunities',
        entity_id: String(id),
        metadata: { stage_id: String(dto.stage_id) },
      });
      return opp;
    });
  }

  // Win opportunity
  @Post('crm/opportunities/:id/win')
  @Roles('owner', 'admin', 'manager')
  async winOpportunity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { create_invoice?: boolean },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.winOpportunity(trx, id, p.tenantId, dto.create_invoice ?? false);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'win',
        entity: 'crm_opportunities',
        entity_id: String(id),
        metadata: { create_invoice: String(dto.create_invoice ?? false) },
      });
      return result;
    });
  }

  // Lose opportunity
  @Post('crm/opportunities/:id/lose')
  @Roles('owner', 'admin', 'manager')
  async loseOpportunity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { reason?: string },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const opp = await this.service.loseOpportunity(trx, id, dto.reason);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'lose',
        entity: 'crm_opportunities',
        entity_id: String(id),
        metadata: dto.reason ? { reason: dto.reason } : {},
      });
      return opp;
    });
  }

  // ─── Activities ───

  // List activities
  @Get('crm/activities')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'opportunity_id', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllActivities(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('opportunity_id') opportunity_id?: string,
    @Query('contact_id') contact_id?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllActivities(trx, {
        opportunity_id: opportunity_id ? parseInt(opportunity_id, 10) : undefined,
        contact_id: contact_id ? parseInt(contact_id, 10) : undefined,
        type,
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Create activity
  @Post('crm/activities')
  @Roles('owner', 'admin', 'manager')
  async createActivity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateActivityDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const activity = await this.service.createActivity(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'crm_activities',
        entity_id: String(activity.id),
        metadata: { subject: String(activity.subject) },
      });
      return activity;
    });
  }

  // Update activity
  @Put('crm/activities/:id')
  @Roles('owner', 'admin', 'manager')
  async updateActivity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const activity = await this.service.updateActivity(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'crm_activities',
        entity_id: String(id),
      });
      return activity;
    });
  }

  // Delete activity
  @Delete('crm/activities/:id')
  @Roles('owner', 'admin')
  async deleteActivity(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteActivity(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'crm_activities',
        entity_id: String(id),
      });
      return result;
    });
  }

  // ─── Dashboard & Reports ───

  // CRM Dashboard
  @Get('crm/dashboard')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async getDashboard(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getDashboard(trx),
    );
  }

  // Sales pipeline report
  @Get('reports/sales-pipeline')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async getSalesPipelineReport(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getSalesPipelineReport(trx),
    );
  }
}
