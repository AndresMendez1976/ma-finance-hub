// DTO for creating a maintenance schedule
import { IsString, IsOptional, IsNumber, IsDateString, IsIn, MaxLength } from 'class-validator';

export class CreateMaintenanceScheduleDto {
  @IsNumber()
  fixed_asset_id!: number;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'])
  frequency!: string;

  @IsDateString()
  next_due_date!: string;
}
