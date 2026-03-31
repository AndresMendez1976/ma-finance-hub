import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import * as fs from 'fs';
import * as path from 'path';
import { JwtPayload, AuthenticatedPrincipal } from './interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly allowedIssuers: string[];

  constructor(config: ConfigService) {
    // Support both file-based keys (dev) and inline keys (prod via env/secrets)
    const publicKeyInline = config.get<string>('JWT_PUBLIC_KEY');
    const publicKeyPath = config.get<string>('JWT_DEV_PUBLIC_KEY_PATH');

    let publicKey: string;
    if (publicKeyInline) {
      publicKey = publicKeyInline;
    } else if (publicKeyPath) {
      publicKey = fs.readFileSync(path.resolve(process.cwd(), publicKeyPath), 'utf-8');
    } else {
      throw new Error('JWT public key not configured: set JWT_PUBLIC_KEY or JWT_DEV_PUBLIC_KEY_PATH');
    }

    const audience = config.get<string>('JWT_AUDIENCE', 'ma-finance-hub');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      secretOrKey: publicKey,
      audience,
      ignoreExpiration: false,
    });

    const issuerWhitelist = config.get<string>('JWT_ISSUER_WHITELIST', '');
    this.allowedIssuers = issuerWhitelist.split(',').map((s) => s.trim()).filter(Boolean);

    if (this.allowedIssuers.length === 0) {
      throw new Error('JWT_ISSUER_WHITELIST is empty — no issuers would be accepted');
    }
  }

  validate(payload: JwtPayload): AuthenticatedPrincipal {
    if (!this.allowedIssuers.includes(payload.iss)) {
      throw new UnauthorizedException('Token issuer not allowed');
    }

    if (typeof payload.tenant_id !== 'number' || payload.tenant_id <= 0) {
      throw new UnauthorizedException('Missing or invalid tenant_id in token');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Missing sub in token');
    }

    return {
      sub: payload.sub,
      tenantId: payload.tenant_id,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      issuer: payload.iss,
      jti: payload.jti || '',
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
