import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secret'),
    });
  }

  async validate(payload: any) {
    const user = await this.db.queryOne(
      `SELECT id, tenant_id, email, first_name, last_name, role, status,
              avatar_url, department, designation, preferences
       FROM users WHERE id = $1 AND status = 'active'`,
      [payload.sub],
    );
    if (!user) throw new UnauthorizedException();
    return {
      ...user,
      sub: payload.sub,
      tenantId: payload.tenantId,
    };
  }
}
