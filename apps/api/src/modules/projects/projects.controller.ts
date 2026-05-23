import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';

@ApiTags('Projects')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query() query: any,
  ) {
    return this.projectsService.findAll(tenantId, user.id, user.role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.findById(tenantId, id, user.id, user.role);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get project analytics' })
  getStats(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.getProjectStats(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(tenantId, userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(tenantId, id, userId, dto);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to project' })
  addMember(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { userId: string; role?: string; allocation?: number },
  ) {
    return this.projectsService.addMember(tenantId, id, body, userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from project' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.projectsService.removeMember(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive project' })
  delete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.delete(tenantId, id);
  }
}
