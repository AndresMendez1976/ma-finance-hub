import { Injectable, Inject, UnauthorizedException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { KNEX_CONNECTION } from '../database';
import { MfaService } from './mfa.service';

export interface LoginResult {
  token?: string;
  requires_mfa?: boolean;
  mfa_session_token?: string;
  requires_tenant_selection?: boolean;
  tenants?: { id: number; company_name: string }[];
}

@Injectable()
export class LoginService {
  private readonly privateKey: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly keyId: string;

  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    private readonly mfaService: MfaService,
    config: ConfigService,
  ) {
    const keyInline = config.get<string>('JWT_PRIVATE_KEY');
    const keyPath = config.get<string>('JWT_DEV_PRIVATE_KEY_PATH');
    if (keyInline) {
      this.privateKey = keyInline;
    } else if (keyPath) {
      this.privateKey = fs.readFileSync(path.resolve(process.cwd(), keyPath), 'utf-8');
    } else {
      throw new Error('JWT private key not configured');
    }
    this.issuer = 'ma-finance-hub-dev';
    this.audience = config.get<string>('JWT_AUDIENCE', 'ma-finance-hub');
    this.keyId = config.get<string>('JWT_DEV_KID', 'dev-key-001');
  }

  /**
   * Compute lockout duration based on cumulative failed attempts.
   * 5+ failures  → 15 min
   * 10+ failures → 1 hr
   * 20+ failures → 24 hr
   */
  private static lockoutMinutes(attempts: number): number {
    if (attempts >= 20) return 24 * 60;
    if (attempts >= 10) return 60;
    if (attempts >= 5) return 15;
    return 0;
  }

  async login(email: string, password: string, tenantId?: number): Promise<LoginResult> {
    const userResult: { rows: Record<string, unknown>[] } = await this.db.raw('SELECT * FROM find_user_for_login(?)', [email]);
    const user = userResult.rows[0];
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Invalid credentials');

    // Account lockout check
    if (user.locked_until) {
      const lockedUntil = new Date(String(user.locked_until));
      if (lockedUntil > new Date()) {
        throw new HttpException('Account locked. Try again later.', 423);
      }
      // Lock expired, reset
      await this.db('users').where({ id: user.id as number }).update({
        failed_login_attempts: 0,
        locked_until: null,
      });
    }

    const valid = await bcrypt.compare(password, String(user.password_hash));
    if (!valid) {
      // Increment failed attempts and apply tiered lockout
      const attempts = ((user.failed_login_attempts as number) || 0) + 1;
      const updates: Record<string, unknown> = { failed_login_attempts: attempts };
      const lockMinutes = LoginService.lockoutMinutes(attempts);
      if (lockMinutes > 0) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + lockMinutes);
        updates.locked_until = lockUntil;
      }
      await this.db('users').where({ id: user.id as number }).update(updates);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Password valid — reset failed attempts
    if ((user.failed_login_attempts as number) > 0) {
      await this.db('users').where({ id: user.id as number }).update({
        failed_login_attempts: 0,
        locked_until: null,
      });
    }

    // Resolve tenant_id if not provided
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      // Find all active memberships for this user
      const membershipsResult: { rows: Record<string, unknown>[] } = await this.db.raw(
        `SELECT tm.tenant_id, t.company_name
         FROM tenant_memberships tm
         JOIN tenants t ON t.id = tm.tenant_id
         WHERE tm.user_id = ? AND tm.is_active = true
         ORDER BY t.company_name`,
        [user.id as number],
      );
      const memberships = membershipsResult.rows;

      if (memberships.length === 0) {
        throw new UnauthorizedException('No active memberships found');
      }
      if (memberships.length > 1) {
        return {
          requires_tenant_selection: true,
          tenants: memberships.map((m) => ({
            id: m.tenant_id as number,
            company_name: m.company_name as string,
          })),
        };
      }
      // Single membership — use it automatically
      resolvedTenantId = memberships[0].tenant_id as number;
    }

    const memberResult: { rows: Record<string, unknown>[] } = await this.db.raw('SELECT * FROM find_membership_for_login(?, ?)', [user.id as number, resolvedTenantId]);
    const membership = memberResult.rows[0];
    if (!membership || !membership.is_active) throw new UnauthorizedException('Invalid credentials');

    // Check if MFA is enabled
    if (user.mfa_enabled) {
      // Return a short-lived MFA session token instead of the full JWT
      const mfaSessionToken = jwt.sign(
        {
          sub: user.external_subject as string,
          tenant_id: resolvedTenantId,
          user_id: user.id as number,
          roles: [membership.role as string],
          purpose: 'mfa',
        },
        this.privateKey,
        { algorithm: 'RS256', expiresIn: '5m', issuer: this.issuer, audience: this.audience, keyid: this.keyId, jwtid: crypto.randomUUID() },
      );
      return { requires_mfa: true, mfa_session_token: mfaSessionToken };
    }

    // No MFA — issue full JWT
    const token = jwt.sign(
      { sub: user.external_subject as string, tenant_id: resolvedTenantId, roles: [membership.role as string] },
      this.privateKey,
      { algorithm: 'RS256', expiresIn: '8h', issuer: this.issuer, audience: this.audience, keyid: this.keyId, jwtid: crypto.randomUUID() },
    );

    return { token };
  }

  async validateMfa(mfaSessionToken: string, totpToken?: string, backupCode?: string): Promise<{ token: string }> {
    // Decode and verify the MFA session token
    const publicKey = this.getPublicKeyFromPrivate();
    let payload: Record<string, unknown>;
    try {
      payload = jwt.verify(mfaSessionToken, publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA session');
    }

    if (payload.purpose !== 'mfa') {
      throw new UnauthorizedException('Invalid MFA session token');
    }

    const userId = payload.user_id as number;
    let valid = false;

    if (totpToken) {
      valid = await this.mfaService.validateToken(userId, totpToken);
    } else if (backupCode) {
      valid = await this.mfaService.validateBackupCode(userId, backupCode);
    }

    if (!valid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // MFA verified — issue full JWT
    const token = jwt.sign(
      { sub: payload.sub as string, tenant_id: payload.tenant_id as number, roles: payload.roles as string[] },
      this.privateKey,
      { algorithm: 'RS256', expiresIn: '8h', issuer: this.issuer, audience: this.audience, keyid: this.keyId, jwtid: crypto.randomUUID() },
    );

    return { token };
  }

  private getPublicKeyFromPrivate(): string {
    const keyObj = crypto.createPublicKey(this.privateKey);
    return keyObj.export({ type: 'spki', format: 'pem' });
  }

  async setPassword(userId: number, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    await this.db('users').where({ id: userId }).update({ password_hash: hash });
  }
}
