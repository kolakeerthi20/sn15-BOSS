import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';

@ApiTags('Resources')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('capacity')
  getCapacity(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.resourcesService.getCapacityPlanning(tenantId, start, end);
  }

  @Get('workload')
  getWorkload(@TenantId() tenantId: string, @Query('weeks') weeks: number) {
    return this.resourcesService.getWorkloadMatrix(tenantId, weeks || 4);
  }

  @Get('skills')
  getSkills(@TenantId() tenantId: string) {
    return this.resourcesService.getSkillMatrix(tenantId);
  }

  @Post('allocate')
  allocate(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.resourcesService.allocate(tenantId, body, userId);
  }
}
