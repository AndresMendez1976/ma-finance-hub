// MFA Service — TOTP setup, verification, backup codes, encryption
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verify as otpVerify } from 'otplib';
import * as QRCode from 'qrcode';
import { KNEX_CONNECTION } from '../database';

@Injectable()
export class MfaService {
  private readonly encryptionKey: Buffer;

  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    config: ConfigService,
  ) {
    // AES-256 key from env, must be 32 bytes (64 hex chars)
    const keyHex = config.get<string>('MFA_ENCRYPTION_KEY', crypto.randomBytes(32).toString('hex'));
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  // Encrypt TOTP secret with AES-256-GCM
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  }

  // Decrypt TOTP secret
  private decrypt(encrypted: string): string {
    const [ivHex, tagHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Generate 10 backup codes (8 chars each, hex uppercase)
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Setup MFA — generate secret + QR code + backup codes
  async setup(userId: number, email: string): Promise<{ secret: string; qr_code_data_url: string; backup_codes: string[] }> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: 'MA Finance Hub', label: email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Generate and hash backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedCodes = await Promise.all(
      backupCodes.map(async (code) => ({ code: await bcrypt.hash(code, 10), used: false })),
    );

    // Store encrypted secret and hashed backup codes (not yet enabled)
    const encryptedSecret = this.encrypt(secret);
    await this.db('users').where({ id: userId }).update({
      mfa_secret: encryptedSecret,
      mfa_backup_codes: JSON.stringify(hashedCodes),
    });

    return { secret, qr_code_data_url: qrCodeDataUrl, backup_codes: backupCodes };
  }

  // Verify setup — validate the first TOTP token to confirm setup
  async verifySetup(userId: number, token: string): Promise<boolean> {
    const user = await this.db('users').where({ id: userId }).first() as Record<string, unknown> | undefined;
    if (!user || !user.mfa_secret) throw new BadRequestException('MFA not set up');

    const secret = this.decrypt(String(user.mfa_secret));
    const result = await otpVerify({ token, secret });
    if (!result.valid) throw new BadRequestException('Invalid MFA token');

    await this.db('users').where({ id: userId }).update({
      mfa_enabled: true,
      mfa_verified_at: this.db.fn.now(),
    });

    return true;
  }

  // Validate TOTP token (during login)
  async validateToken(userId: number, token: string): Promise<boolean> {
    const user = await this.db('users').where({ id: userId }).first() as Record<string, unknown> | undefined;
    if (!user || !user.mfa_secret) return false;

    const secret = this.decrypt(String(user.mfa_secret));
    const result = await otpVerify({ token, secret });
    return result.valid;
  }

  // Validate backup code (during login)
  async validateBackupCode(userId: number, code: string): Promise<boolean> {
    const user = await this.db('users').where({ id: userId }).first() as Record<string, unknown> | undefined;
    if (!user || !user.mfa_backup_codes) return false;

    const codes = (typeof user.mfa_backup_codes === 'string'
      ? JSON.parse(user.mfa_backup_codes)
      : user.mfa_backup_codes) as { code: string; used: boolean }[];

    for (let i = 0; i < codes.length; i++) {
      if (!codes[i].used && await bcrypt.compare(code, codes[i].code)) {
        codes[i].used = true;
        await this.db('users').where({ id: userId }).update({
          mfa_backup_codes: JSON.stringify(codes),
        });
        return true;
      }
    }
    return false;
  }

  // Disable MFA
  async disable(userId: number, token: string, password: string): Promise<boolean> {
    const user = await this.db('users').where({ id: userId }).first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    // Verify password
    const validPassword = await bcrypt.compare(password, String(user.password_hash));
    if (!validPassword) throw new BadRequestException('Invalid password');

    // Verify current TOTP
    const validToken = await this.validateToken(userId, token);
    if (!validToken) throw new BadRequestException('Invalid MFA token');

    await this.db('users').where({ id: userId }).update({
      mfa_enabled: false,
      mfa_secret: null,
      mfa_backup_codes: null,
      mfa_verified_at: null,
    });

    return true;
  }
}
