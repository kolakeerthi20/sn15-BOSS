import {
  Controller, Get, Patch, Param, Body, Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users in tenant' })
  findAll(@TenantId() tenantId: string, @Query() query: any) {
    return this.usersService.findAll(tenantId, query);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get all departments' })
  getDepartments(@TenantId() tenantId: string) {
    return this.usersService.getDepartments(tenantId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@TenantId() tenantId: string, @CurrentUser('id') userId: string) {
    return this.usersService.findById(tenantId, userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.usersService.update(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.usersService.update(tenantId, id, dto);
  }
}
