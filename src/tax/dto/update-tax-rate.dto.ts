// DTO for updating a tax rate
import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, IsArray, ValidateNested, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TaxRateComponentDto } from './create-tax-rate.dto';

export class UpdateTaxRateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jurisdiction?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsBoolean()
  is_compound?: boolean;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  effective_date?: string;

  @IsOptional()
  @IsDateString()
  expiration_date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxRateComponentDto)
  components?: TaxRateComponentDto[];
}
