import {
  Controller, Post, Body, UseGuards, Get, Req, Res,
  HttpCode, HttpStatus, Delete, Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { IsString, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles, UserRole } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

export class AssignRoleDto {
  @IsString() targetUserId: string;
  @IsString() newRole: string;
  @IsOptional() @IsString() note?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── Local auth ───────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user (role starts as pending)' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.headers['user-agent'], req.ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout — revoke all refresh tokens' })
  async logout(@CurrentUser('sub') userId: string) {
    await this.authService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: any) {
    return user;
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  /**
   * Step 1 — Redirect to Google
   * Frontend: GET /api/v1/auth/google?state=<tenantSlug>
   * The ?state param is forwarded through Google and returned on callback.
   */
  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth — pass ?state=tenantSlug' })
  @ApiQuery({ name: 'state', required: true, description: 'Tenant slug (e.g. acme)' })
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google — no body needed
  }

  /**
   * Step 2 — Google redirects back here
   * Success → redirects to /auth/callback with tokens in query params
   * Failure → redirects to /auth/login?error=google_failed
   */
  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback (handled by Passport)' })
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.authService.googleLoginSuccess(req.user);
      const frontendUrl = this.config.get<string>('frontendUrl');
      const params = new URLSearchParams({
        accessToken:  result.accessToken,
        refreshToken: result.refreshToken,
        role:         result.user.role,
      });
      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch {
      const frontendUrl = this.config.get<string>('frontendUrl');
      return res.redirect(`${frontendUrl}/auth/login?error=google_failed`);
    }
  }

  // ─── Role management ──────────────────────────────────────────────────────

  /**
   * Assign (or change) a role on any user in the caller's tenant.
   * • project_manager → can assign any role
   * • lead            → can assign intern / senior_developer only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROJECT_MANAGER, UserRole.LEAD)
  @Patch('assign-role')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Assign role to a user (lead / project_manager only)' })
  async assignRole(
    @CurrentUser() caller: any,
    @Body() dto: AssignRoleDto,
  ) {
    return this.authService.assignRole(
      caller.tenantId,
      caller.sub,
      caller.role,
      dto.targetUserId,
      dto.newRole,
      dto.note,
    );
  }

  /** Users waiting for a role assignment (role = 'pending') */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROJECT_MANAGER, UserRole.LEAD)
  @Get('pending-users')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List users awaiting role assignment' })
  async pendingUsers(@CurrentUser('tenantId') tenantId: string) {
    return this.authService.getPendingUsers(tenantId);
  }

  /** All users in the tenant with last role-assignment audit info */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROJECT_MANAGER, UserRole.LEAD)
  @Get('users-with-roles')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all users with role assignment history' })
  async usersWithRoles(@CurrentUser('tenantId') tenantId: string) {
    return this.authService.getAllUsersWithRoles(tenantId);
  }
}
