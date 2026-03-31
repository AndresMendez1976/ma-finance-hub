import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../database';
import { EntitlementsModule } from '../entitlements';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IdentityGuard } from './identity.guard';
import { RolesGuard } from './roles.guard';
import { TenantContextService } from './tenant-context.service';
import { MembershipService } from './membership.service';
import { SessionService } from './session.service';
import { AuditService } from './audit.service';
import { LoginService } from './login.service';
import { AuthController } from './auth.controller';
import { LoginController } from './login.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), DatabaseModule, forwardRef(() => EntitlementsModule)],
  controllers: [AuthController, LoginController],
  providers: [
    JwtStrategy, JwtAuthGuard, IdentityGuard, RolesGuard,
    TenantContextService, MembershipService, SessionService, AuditService, LoginService,
  ],
  exports: [JwtAuthGuard, IdentityGuard, RolesGuard, TenantContextService, MembershipService, SessionService, AuditService, LoginService],
})
export class AuthModule {}
