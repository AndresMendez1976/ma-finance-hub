import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { AuthModule } from '../auth';
import { AppConfigModule } from '../config';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [DatabaseModule, AuthModule, AppConfigModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
