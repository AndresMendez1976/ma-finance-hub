// DTO for creating equipment usage
import { IsString, IsOptional, IsNumber, IsDateString, MaxLength, Min } from 'class-validator';

export class CreateEquipmentUsageDto {
  @IsNumber()
  equipment_id!: number;

  @IsOptional()
  @IsNumber()
  project_id?: number;

  @IsDateString()
  date!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hours!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rate_override?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  operator?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
