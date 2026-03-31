import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { MembershipService } from './membership.service';
import { SessionService } from './session.service';
import { AuthenticatedPrincipal, ResolvedIdentity } from './interfaces';

export interface RequestWithIdentity {
  user: AuthenticatedPrincipal;
  identity: ResolvedIdentity;
}

@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly membershipService: MembershipService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithIdentity>();
    const principal = request.user;

    request.identity = await this.tenantContext.runInTenantContext(
      principal.tenantId,
      principal.sub,
      (trx) => this.membershipService.resolveIdentity(trx),
    );

    // Track session if jti is present
    if (principal.jti) {
      await this.sessionService.trackSession({
        tenantId: principal.tenantId,
        userId: Number(request.identity.user.id),
        jti: principal.jti,
        issuedAt: new Date(principal.iat * 1000),
        expiresAt: new Date(principal.exp * 1000),
      });
    }

    return true;
  }
}
