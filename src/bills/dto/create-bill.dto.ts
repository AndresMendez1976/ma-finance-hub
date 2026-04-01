// DTO for creating a new vendor bill with line items
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class BillLineDto {
  @IsString()
  @MaxLength(500)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price!: number;

  @IsNumber()
  account_id!: number;
}

export class CreateBillDto {
  @IsNumber()
  contact_id!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendor_bill_number?: string;

  @IsDateString()
  date!: string;

  @IsDateString()
  due_date!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax_rate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  purchase_order_id?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BillLineDto)
  lines!: BillLineDto[];
}
