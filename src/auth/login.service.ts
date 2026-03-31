import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { KNEX_CONNECTION } from '../database';

@Injectable()
export class LoginService {
  private readonly privateKey: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly keyId: string;

  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
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

  async login(email: string, password: string, tenantId: number): Promise<{ token: string }> {
    const userResult: { rows: Record<string, unknown>[] } = await this.db.raw('SELECT * FROM find_user_for_login(?)', [email]);
    const user = userResult.rows[0];
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, String(user.password_hash));
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const memberResult: { rows: Record<string, unknown>[] } = await this.db.raw('SELECT * FROM find_membership_for_login(?, ?)', [user.id as number, tenantId]);
    const membership = memberResult.rows[0];
    if (!membership || !membership.is_active) throw new UnauthorizedException('Invalid credentials');

    const token = jwt.sign(
      { sub: user.external_subject as string, tenant_id: tenantId, roles: [membership.role as string] },
      this.privateKey,
      { algorithm: 'RS256', expiresIn: '8h', issuer: this.issuer, audience: this.audience, keyid: this.keyId, jwtid: crypto.randomUUID() },
    );

    return { token };
  }

  async setPassword(userId: number, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    await this.db('users').where({ id: userId }).update({ password_hash: hash });
  }
}
