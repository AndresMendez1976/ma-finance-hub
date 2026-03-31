// DTO for creating a new project
import { IsString, IsOptional, IsNumber, IsDateString, IsIn, Min, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsNumber()
  contact_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['fixed', 'time_and_materials', 'non_billable'])
  budget_type?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budget_amount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourly_rate?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
