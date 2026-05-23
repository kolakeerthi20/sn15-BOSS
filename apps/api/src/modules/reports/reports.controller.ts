import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('executive-dashboard')
  @ApiOperation({ summary: 'Executive-level dashboard metrics' })
  executiveDashboard(@TenantId() tenantId: string) {
    return this.reportsService.getExecutiveDashboard(tenantId);
  }

  @Get('resource-utilization')
  @ApiOperation({ summary: 'Resource utilization across team' })
  resourceUtilization(@TenantId() tenantId: string, @Query() query: any) {
    return this.reportsService.getResourceUtilization(tenantId, query);
  }

  @Get('employee/:userId')
  @ApiOperation({ summary: 'Employee contribution report' })
  employeeReport(
    @TenantId() tenantId: string,
    @Param('userId') userId: string,
    @Query() query: any,
  ) {
    return this.reportsService.getEmployeeContributionReport(tenantId, userId, query);
  }

  @Get('projects/:id/velocity')
  @ApiOperation({ summary: 'Sprint velocity for a project' })
  projectVelocity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.reportsService.getProjectVelocity(tenantId, id);
  }

  @Get('sprints/:id/burndown')
  @ApiOperation({ summary: 'Sprint burndown chart data' })
  burndown(@Param('id') id: string) {
    return this.reportsService.getBurndownChart(null, id);
  }

  @Get('time')
  @ApiOperation({ summary: 'Time tracking report' })
  timeReport(@TenantId() tenantId: string, @Query() query: any) {
    return this.reportsService.getTimeReport(tenantId, query);
  }

  @Get('overdue-tasks')
  @ApiOperation({ summary: 'All overdue tasks' })
  overdueTasks(@TenantId() tenantId: string) {
    return this.reportsService.getOverdueTasksReport(tenantId);
  }

  @Get('bottlenecks')
  @ApiOperation({ summary: 'Bottleneck analysis - blocked tasks' })
  bottlenecks(@TenantId() tenantId: string, @Query('projectId') projectId: string) {
    return this.reportsService.getBottleneckAnalysis(tenantId, projectId);
  }

  @Get('team-performance')
  @ApiOperation({ summary: 'Team contribution and performance' })
  getTeamPerformance(@TenantId() tenantId: string, @Query() query: any) {
    return this.reportsService.getTeamPerformance(tenantId, query);
  }
}
