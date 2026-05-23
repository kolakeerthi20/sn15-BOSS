import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DailyLogsService } from './daily-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';

@ApiTags('Daily Logs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('daily-logs')
export class DailyLogsController {
  constructor(private readonly dailyLogsService: DailyLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List daily logs with filters' })
  findAll(@TenantId() tenantId: string, @CurrentUser() user: any, @Query() query: any) {
    return this.dailyLogsService.findAll(tenantId, user.id, user.role, query);
  }

  @Get('team-feed')
  @ApiOperation({ summary: 'Real-time team contribution feed' })
  getTeamFeed(@TenantId() tenantId: string, @Query() query: any) {
    return this.dailyLogsService.getTeamFeed(tenantId, query);
  }

  @Get('missing')
  @ApiOperation({ summary: 'Users who havent submitted daily logs' })
  getMissing(@TenantId() tenantId: string, @Query('date') date: string) {
    return this.dailyLogsService.getMissingLogs(tenantId, date);
  }

  @Get('heatmap/:userId')
  @ApiOperation({ summary: 'Contribution heatmap for a user' })
  getHeatmap(
    @TenantId() tenantId: string,
    @Param('userId') userId: string,
    @Query('weeks') weeks: number,
  ) {
    return this.dailyLogsService.getContributionHeatmap(tenantId, userId, weeks);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get daily log details' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.dailyLogsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update daily log (upsert)' })
  createOrUpdate(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.dailyLogsService.createOrUpdate(tenantId, userId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit daily log for manager review' })
  submit(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dailyLogsService.submit(tenantId, id, userId);
  }
}
