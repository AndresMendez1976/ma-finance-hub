// DTO for creating a CRM opportunity
import { IsString, IsNumber, IsOptional, IsDateString, MaxLength, Min } from 'class-validator';

export class CreateOpportunityDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsNumber()
  pipeline_id!: number;

  @IsNumber()
  stage_id!: number;

  @IsOptional()
  @IsNumber()
  contact_id?: number;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  probability?: number;

  @IsOptional()
  @IsDateString()
  expected_close_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;
}
