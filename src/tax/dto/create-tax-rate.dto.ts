// DTO for creating a tax rate with optional components
import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, IsArray, ValidateNested, IsIn, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TaxRateComponentDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsString()
  @IsIn(['federal', 'state', 'county', 'city', 'district'])
  jurisdiction_level!: string;
}

export class CreateTaxRateDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(100)
  jurisdiction!: string;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsOptional()
  @IsBoolean()
  is_compound?: boolean;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  effective_date!: string;

  @IsOptional()
  @IsDateString()
  expiration_date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxRateComponentDto)
  components?: TaxRateComponentDto[];
}
