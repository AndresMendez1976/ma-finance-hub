import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../interfaces';

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedPrincipal => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedPrincipal }>();
    return request.user;
  },
);
