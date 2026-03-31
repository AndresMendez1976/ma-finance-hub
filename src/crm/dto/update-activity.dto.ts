// DTO for updating a CRM activity
import { IsString, IsOptional, IsNumber, IsDateString, IsIn, MaxLength, Min } from 'class-validator';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @IsIn(['call', 'email', 'meeting', 'task', 'note', 'demo', 'follow_up'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  activity_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration_minutes?: number;

  @IsOptional()
  @IsString()
  @IsIn(['planned', 'completed', 'cancelled'])
  status?: string;
}
