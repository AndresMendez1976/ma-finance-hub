// Project reports controller — profitability and time summary reports
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { ProjectsService } from './projects.service';
import { TimeTrackingService } from './time-tracking.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class ProjectReportsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly projectsService: ProjectsService,
    private readonly timeTrackingService: TimeTrackingService,
  ) {}

  @Get('project-profitability')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async projectProfitability(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.projectsService.getProfitabilityReport(trx),
    );
  }

  @Get('time-summary')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'employee_id', required: false })
  @ApiQuery({ name: 'group_by', required: false, description: 'project, employee, or date' })
  async timeSummary(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from?: string, @Query('to') to?: string,
    @Query('project_id') projectId?: string, @Query('employee_id') employeeId?: string,
    @Query('group_by') groupBy?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.timeTrackingService.getTimeSummary(trx, {
        from,
        to,
        project_id: projectId ? parseInt(projectId, 10) : undefined,
        employee_id: employeeId ? parseInt(employeeId, 10) : undefined,
        group_by: groupBy,
      }),
    );
  }
}
