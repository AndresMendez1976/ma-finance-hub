// DTO for creating a new purchase order with line items
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class PoLineDto {
  @IsString()
  @MaxLength(500)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity_ordered!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price!: number;

  @IsOptional()
  @IsNumber()
  account_id?: number;
}

export class CreatePoDto {
  @IsOptional()
  @IsNumber()
  contact_id?: number;

  @IsString()
  @MaxLength(255)
  vendor_name!: string;

  @IsDateString()
  order_date!: string;

  @IsOptional()
  @IsDateString()
  expected_delivery_date?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax_rate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shipping_cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shipping_address?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PoLineDto)
  lines!: PoLineDto[];
}
