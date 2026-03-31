// DTO for creating a CRM activity — matches crm_activities schema
import { IsString, IsOptional, IsNumber, IsDateString, IsIn, IsBoolean, MaxLength } from 'class-validator';

export class CreateActivityDto {
  @IsNumber()
  opportunity_id!: number;

  @IsString()
  @IsIn(['note', 'call', 'email', 'meeting', 'task'])
  type!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
