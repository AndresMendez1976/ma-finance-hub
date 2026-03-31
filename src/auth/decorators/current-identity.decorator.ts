import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ResolvedIdentity } from '../interfaces';
import { RequestWithIdentity } from '../identity.guard';

export const CurrentIdentity = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedIdentity => {
    const request = ctx.switchToHttp().getRequest<RequestWithIdentity>();
    return request.identity;
  },
);
