// DTO for creating a CRM activity
import { IsString, IsOptional, IsNumber, IsDateString, IsIn, MaxLength, Min } from 'class-validator';

export class CreateActivityDto {
  @IsOptional()
  @IsNumber()
  opportunity_id?: number;

  @IsOptional()
  @IsNumber()
  contact_id?: number;

  @IsString()
  @IsIn(['call', 'email', 'meeting', 'task', 'note', 'demo', 'follow_up'])
  type!: string;

  @IsString()
  @MaxLength(255)
  subject!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  activity_date!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration_minutes?: number;

  @IsOptional()
  @IsString()
  @IsIn(['planned', 'completed', 'cancelled'])
  status?: string;
}
