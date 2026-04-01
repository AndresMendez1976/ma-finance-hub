// DTO for creating equipment
import { IsString, IsOptional, IsNumber, IsDateString, MaxLength, Min } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  make?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serial_number?: string;

  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchase_cost?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourly_rate?: number;
}
