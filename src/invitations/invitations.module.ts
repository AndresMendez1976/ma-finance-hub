import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
