import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ENTITLEMENT_KEY } from './requires-entitlement.decorator';
import { EntitlementService } from './entitlement.service';
import { RequestWithIdentity } from '../auth/identity.guard';

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredEntitlement = this.reflector.getAllAndOverride<string>(ENTITLEMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredEntitlement) return true;

    const request = context.switchToHttp().getRequest<RequestWithIdentity>();
    const tenantId = request.user?.tenantId;
    if (!tenantId) throw new ForbiddenException('No tenant context');

    const enabled = await this.entitlementService.isFeatureEnabled(tenantId, requiredEntitlement);
    if (!enabled) {
      throw new ForbiddenException(`Feature '${requiredEntitlement}' is not available on your current plan`);
    }

    return true;
  }
}
