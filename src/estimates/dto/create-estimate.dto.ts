// DTO for creating a new estimate with line items
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class EstimateLineDto {
  @IsString()
  @MaxLength(500)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price!: number;

  @IsOptional()
  @IsNumber()
  account_id?: number;
}

export class CreateEstimateDto {
  @IsString()
  @MaxLength(255)
  customer_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer_email?: string;

  @IsOptional()
  @IsNumber()
  contact_id?: number;

  @IsDateString()
  issue_date!: string;

  @IsDateString()
  expiration_date!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax_rate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EstimateLineDto)
  lines!: EstimateLineDto[];
}
