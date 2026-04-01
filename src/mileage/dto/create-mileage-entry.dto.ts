// DTO for creating a mileage entry
import { IsString, IsOptional, IsNumber, IsDateString, MaxLength, Min } from 'class-validator';

export class CreateMileageEntryDto {
  @IsDateString()
  date!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  miles!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  rate_per_mile?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  purpose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  from_location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  to_location?: string;

  @IsOptional()
  @IsNumber()
  project_id?: number;

  @IsOptional()
  @IsNumber()
  account_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicle?: string;
}
