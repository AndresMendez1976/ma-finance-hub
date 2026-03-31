import { IsDateString, IsOptional } from 'class-validator';

export class SetLockDateDto {
  @IsDateString()
  @IsOptional()
  lock_date!: string | null;
}
