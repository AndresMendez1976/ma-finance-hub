import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Internal ops authentication — two modes:
 *
 * PRODUCTION (INTERNAL_OPS_SECRET set):
 *   Header: x-internal-signature: <timestamp>.<hmac-hex>
 *   HMAC = SHA256(secret, timestamp + "." + method + "." + path + "." + body)
 *   Timestamp must be within 5 minutes. Prevents replay outside window.
 *
 * DEVELOPMENT (INTERNAL_API_KEY set, INTERNAL_OPS_SECRET unset):
 *   Header: x-internal-api-key: <key>
 *   Timing-safe. Comma-separated keys for rotation.
 *
 * NEITHER SET: fail closed.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(InternalApiKeyGuard.name);
  private static readonly MAX_AGE_MS = 5 * 60 * 1000;

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const opsSecret = this.config.get<string>('INTERNAL_OPS_SECRET');
    if (opsSecret) return this.validateHmac(context, opsSecret);

    const staticKeys = this.config.get<string>('INTERNAL_API_KEYS') || this.config.get<string>('INTERNAL_API_KEY');
    if (staticKeys) return this.validateStaticKey(context, staticKeys);

    this.logger.error('No internal auth configured — blocked');
    throw new ForbiddenException('Internal API not configured');
  }

  private validateHmac(context: ExecutionContext, secret: string): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const sig = request.headers['x-internal-signature'] as string;
    if (!sig) throw new ForbiddenException('Missing internal signature');

    const dot = sig.indexOf('.');
    if (dot === -1) throw new ForbiddenException('Malformed signature');

    const timestamp = sig.substring(0, dot);
    const providedHmac = sig.substring(dot + 1);
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) throw new ForbiddenException('Invalid timestamp');

    if (Math.abs(Date.now() - ts) > InternalApiKeyGuard.MAX_AGE_MS) {
      this.logger.warn('Internal ops: signature expired');
      throw new ForbiddenException('Signature expired');
    }

    const body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? '');
    const payload = `${timestamp}.${request.method}.${request.path}.${body}`;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');

    if (!this.safeCompare(providedHmac, expected)) {
      this.logger.warn('Internal ops: invalid HMAC');
      throw new ForbiddenException('Invalid signature');
    }
    return true;
  }

  private validateStaticKey(context: ExecutionContext, keysRaw: string): boolean {
    const keys = keysRaw.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) throw new ForbiddenException('Internal API not configured');

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-internal-api-key'] as string;
    if (!provided) throw new ForbiddenException('Missing internal API key');

    if (!keys.some((k) => this.safeCompare(provided, k))) {
      this.logger.warn('Internal ops: invalid key');
      throw new ForbiddenException('Invalid internal API key');
    }
    return true;
  }

  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'));
    } catch {
      return false;
    }
  }
}
