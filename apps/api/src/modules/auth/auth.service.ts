import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export const ASSIGNABLE_ROLES = ['project_manager', 'lead', 'senior_developer', 'intern'];
export const ROLE_ASSIGNERS   = ['project_manager', 'lead'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Local register ────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const tenant = await this.db.queryOne(
      'SELECT id FROM tenants WHERE slug = $1',
      [dto.tenantSlug],
    );
    if (!tenant) throw new BadRequestException('Organization not found');

    const existing = await this.db.queryOne(
      'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
      [tenant.id, dto.email.toLowerCase()],
    );
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.db.queryOne(
      `INSERT INTO users
         (tenant_id, email, password_hash, first_name, last_name, role, auth_provider)
       VALUES ($1,$2,$3,$4,$5,'pending','local')
       RETURNING id, tenant_id, email, first_name, last_name, role, status`,
      [tenant.id, dto.email.toLowerCase(), passwordHash, dto.firstName, dto.lastName],
    );

    const tokens = await this.generateTokenPair(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Local login ───────────────────────────────────────────────────────────
  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.db.queryOne(
      `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.first_name, u.last_name,
              u.role, u.status, u.avatar_url, u.department, u.designation, u.auth_provider
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND t.slug = $2`,
      [dto.email.toLowerCase(), dto.tenantSlug],
    );

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'active') throw new UnauthorizedException('Account is not active');
    if (user.auth_provider === 'google') {
      throw new UnauthorizedException('This account uses Google Sign-In. Please use the Google button.');
    }

    const isValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const tokens = await this.generateTokenPair(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken, userAgent, ip);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Emails that always get project_manager role on Google sign-in ──────────
  private readonly SUPER_ADMIN_EMAILS = ['support@sn15.ai'];

  private getRoleForEmail(email: string): string {
    return this.SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
      ? 'project_manager'
      : 'pending';
  }

  // ─── Google OAuth: find or create ──────────────────────────────────────────
  async findOrCreateGoogleUser(
    googleUser: { googleId: string; email: string; firstName: string; lastName: string; picture?: string },
    tenantSlug: string,
  ) {
    // 1. Resolve tenant
    const tenant = await this.db.queryOne(
      'SELECT id FROM tenants WHERE slug = $1',
      [tenantSlug],
    );
    if (!tenant) throw new BadRequestException(`Organization "${tenantSlug}" not found`);

    const assignedRole = this.getRoleForEmail(googleUser.email);

    // 2. Look up by google_id first, then email
    let user = await this.db.queryOne(
      `SELECT * FROM users WHERE google_id = $1 AND tenant_id = $2`,
      [googleUser.googleId, tenant.id],
    );

    if (!user) {
      user = await this.db.queryOne(
        `SELECT * FROM users WHERE email = $1 AND tenant_id = $2`,
        [googleUser.email.toLowerCase(), tenant.id],
      );
    }

    if (user) {
      // Existing user — update Google fields.
      // Also promote to project_manager if this is a super-admin email still sitting as pending.
      const roleUpdate = assignedRole === 'project_manager' && user.role === 'pending'
        ? `, role = 'project_manager'`
        : '';

      await this.db.query(
        `UPDATE users SET
           google_id      = $1,
           google_email   = $2,
           google_picture = $3,
           auth_provider  = 'google',
           last_login_at  = NOW(),
           avatar_url     = COALESCE(avatar_url, $3)
           ${roleUpdate}
         WHERE id = $4`,
        [googleUser.googleId, googleUser.email, googleUser.picture, user.id],
      );
      user.auth_provider = 'google';
      if (roleUpdate) {
        user.role = 'project_manager';
        this.logger.log(`Auto-promoted ${user.email} to project_manager`);
      }
    } else {
      // Brand-new user
      user = await this.db.queryOne(
        `INSERT INTO users
           (tenant_id, email, google_id, google_email, google_picture,
            first_name, last_name, avatar_url, role, auth_provider, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$5,$8,'google','active')
         RETURNING *`,
        [
          tenant.id, googleUser.email.toLowerCase(),
          googleUser.googleId, googleUser.email, googleUser.picture,
          googleUser.firstName, googleUser.lastName,
          assignedRole,
        ],
      );
      this.logger.log(`New Google user: ${user.email} (role=${assignedRole}, tenant=${tenantSlug})`);

      // Notify all leads and project_managers that someone is waiting for role approval
      if (assignedRole === 'pending') {
        this.notifyManagersOfPendingUser(tenant.id, user).catch((err) =>
          this.logger.error('Failed to send pending-user notifications', err),
        );
      }
    }

    return user;
  }

  // ─── Google OAuth callback — generate tokens & redirect ────────────────────
  async googleLoginSuccess(user: any) {
    const tokens = await this.generateTokenPair(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken, 'google-oauth', null);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Refresh tokens ────────────────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.db.queryMany(
      `SELECT * FROM refresh_tokens
       WHERE user_id = $1 AND expires_at > NOW() AND revoked_at IS NULL
       ORDER BY created_at DESC LIMIT 10`,
      [payload.sub],
    );

    let validToken: any = null;
    for (const t of stored) {
      if (await bcrypt.compare(refreshToken, t.token_hash)) {
        validToken = t;
        break;
      }
    }
    if (!validToken) throw new UnauthorizedException('Refresh token expired');

    await this.db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [validToken.id],
    );

    const user = await this.db.queryOne(
      'SELECT id, tenant_id, email, first_name, last_name, role, status, avatar_url FROM users WHERE id = $1',
      [payload.sub],
    );

    const tokens = await this.generateTokenPair(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken, null, null);
    return tokens;
  }

  // ─── Role assignment (lead / project_manager only) ─────────────────────────
  async assignRole(
    tenantId: string,
    assignerId: string,
    assignerRole: string,
    targetUserId: string,
    newRole: string,
    note?: string,
  ) {
    if (!ROLE_ASSIGNERS.includes(assignerRole)) {
      throw new ForbiddenException('Only Project Managers and Leads can assign roles');
    }
    if (!ASSIGNABLE_ROLES.includes(newRole)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
    }

    const target = await this.db.queryOne(
      'SELECT id, role, email, first_name, last_name FROM users WHERE id = $1 AND tenant_id = $2',
      [targetUserId, tenantId],
    );
    if (!target) throw new BadRequestException('User not found');

    // Leads can only assign intern / senior_developer (not PM)
    if (assignerRole === 'lead' && ['project_manager'].includes(newRole)) {
      throw new ForbiddenException('Leads can only assign intern or senior_developer roles');
    }

    await this.db.transaction(async (client) => {
      await client.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        [newRole, targetUserId],
      );
      await client.query(
        `INSERT INTO role_assignments (tenant_id, user_id, assigned_by, old_role, new_role, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenantId, targetUserId, assignerId, target.role, newRole, note || null],
      );
    });

    return {
      message: `Role updated to ${newRole} for ${target.first_name} ${target.last_name}`,
      user: { ...target, role: newRole },
    };
  }

  // ─── Get pending users (awaiting role assignment) ──────────────────────────
  async getPendingUsers(tenantId: string) {
    return this.db.queryMany(
      `SELECT id, email, first_name, last_name, avatar_url, google_picture,
              role, auth_provider, created_at
       FROM users
       WHERE tenant_id = $1 AND role = 'pending' AND status = 'active'
       ORDER BY created_at DESC`,
      [tenantId],
    );
  }

  // ─── Get all users with role info ─────────────────────────────────────────
  async getAllUsersWithRoles(tenantId: string) {
    return this.db.queryMany(
      `SELECT
         u.id, u.email, u.first_name, u.last_name,
         u.avatar_url, u.google_picture, u.role, u.auth_provider,
         u.department, u.designation, u.status, u.created_at, u.last_login_at,
         ra.new_role AS last_assigned_role,
         ab.first_name || ' ' || ab.last_name AS assigned_by_name,
         ra.created_at AS role_assigned_at
       FROM users u
       LEFT JOIN LATERAL (
         SELECT * FROM role_assignments
         WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
       ) ra ON true
       LEFT JOIN users ab ON ab.id = ra.assigned_by
       WHERE u.tenant_id = $1
       ORDER BY u.role, u.first_name`,
      [tenantId],
    );
  }

  // ─── Logout ────────────────────────────────────────────────────────────────
  async logout(userId: string) {
    await this.db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId],
    );
  }

  async validateUser(email: string, password: string, tenantSlug: string) {
    const user = await this.db.queryOne(
      `SELECT u.* FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND t.slug = $2`,
      [email.toLowerCase(), tenantSlug],
    );
    if (!user) return null;
    if (user.auth_provider === 'google') return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    return valid ? user : null;
  }

  // ─── Notify leads/PMs of a new pending user ───────────────────────────────
  private async notifyManagersOfPendingUser(tenantId: string, newUser: any) {
    const managers = await this.db.queryMany(
      `SELECT id FROM users
       WHERE tenant_id = $1 AND role IN ('project_manager', 'lead') AND status = 'active'`,
      [tenantId],
    );

    const fullName = `${newUser.first_name} ${newUser.last_name}`.trim() || newUser.email;

    await Promise.all(
      managers.map((m) =>
        this.notificationsService.create({
          tenantId,
          recipientId: m.id,
          actorId:     newUser.id,
          type:        'role_approval_requested',
          title:       'New member awaiting role approval',
          message:     `${fullName} (${newUser.email}) just joined and needs a role assigned before they can access the platform.`,
          entityType:  'user',
          entityId:    newUser.id,
          metadata:    { userEmail: newUser.email, userName: fullName },
        }),
      ),
    );

    this.logger.log(
      `Sent role-approval notifications to ${managers.length} manager(s) for ${newUser.email}`,
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  private async generateTokenPair(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
    userAgent?: string,
    ip?: string,
  ) {
    const hash = await bcrypt.hash(token, 8);
    const exp = new Date();
    exp.setDate(exp.getDate() + 7);
    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, hash, exp, userAgent || null, ip || null],
    );
  }

  private sanitizeUser(user: any) {
    const { password_hash, ...safe } = user;
    return safe;
  }
}
