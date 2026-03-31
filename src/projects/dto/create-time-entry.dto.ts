// DTO for creating a new time entry
import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, Min, MaxLength } from 'class-validator';

export class CreateTimeEntryDto {
  @IsNumber()
  project_id!: number;

  @IsOptional()
  @IsNumber()
  employee_id?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  start_time?: string;

  @IsOptional()
  @IsString()
  end_time?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration_minutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourly_rate?: number;
}
