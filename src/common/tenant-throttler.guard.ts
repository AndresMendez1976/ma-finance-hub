import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Tenant-aware throttler. Extracts tenant_id from the JWT payload
 * (without full verification — signature is verified later by JwtAuthGuard).
 * This ensures each tenant has its own rate limit quota.
 * Falls back to IP for unauthenticated or malformed tokens.
 */
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as { headers?: Record<string, string>; ip?: string };
    const authHeader = request.headers?.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payloadB64 = token.split('.')[1];
        if (payloadB64) {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
          if (typeof payload.tenant_id === 'number' && payload.tenant_id > 0) {
            return `tenant:${payload.tenant_id}`;
          }
        }
      } catch {
        // Malformed token — fall through to IP
      }
    }

    return `ip:${request.ip || 'unknown'}`;
  }
}
