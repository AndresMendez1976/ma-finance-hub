// API Key authentication guard — accepts X-API-Key header as alternative to JWT Bearer
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.module';
import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const request = context.switchToHttp().getRequest() as { headers: Record<string, string | undefined>; user?: Record<string, unknown> };
    const apiKey = request.headers['x-api-key'];

    // If no API key header, let the request pass through (JWT guard will handle it)
    if (!apiKey) {
      return true;
    }

    const trx = await this.knex.transaction();
    try {
      const keyRecord = await this.apiKeysService.validateKey(trx, apiKey);
      await trx.commit();

      if (!keyRecord) {
        throw new UnauthorizedException('Invalid API key');
      }

      // Attach tenant and key info to request, similar to JWT principal
      request.user = {
        sub: `api-key:${String(keyRecord.id)}`,
        tenantId: Number(keyRecord.tenant_id),
        role: 'api',
        apiKey: keyRecord,
      };

      return true;
    } catch (err) {
      await trx.rollback();
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('API key validation failed');
    }
  }
}
