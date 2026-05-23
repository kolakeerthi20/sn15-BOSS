import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks with filters' })
  findAll(@TenantId() tenantId: string, @CurrentUser() user: any, @Query() query: any) {
    return this.tasksService.findAll(tenantId, user.id, user.role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details with subtasks, comments, time' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tasksService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(tenantId, userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(tenantId, id, userId, dto);
  }

  @Post(':id/time')
  @ApiOperation({ summary: 'Log time on a task' })
  logTime(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { hours: number; description?: string; date?: string; isBillable?: boolean },
  ) {
    return this.tasksService.logTime(id, userId, tenantId, dto);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  addComment(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { content?: string; videoUrl?: string; imageUrls?: string[]; updateType?: string; progressPct?: number },
  ) {
    return this.tasksService.addComment(id, userId, tenantId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel/delete task' })
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tasksService.delete(tenantId, id);
  }
}
