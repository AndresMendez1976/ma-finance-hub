// DTO for creating a new invoice with line items
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, MaxLength, ArrayMinSize, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineDto {
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

  @IsOptional()
  @IsNumber()
  product_id?: number;
}

export class CreateInvoiceDto {
  @IsString()
  @MaxLength(255)
  customer_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customer_address?: string;

  @IsDateString()
  issue_date!: string;

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
  contact_id?: number;

  @IsOptional()
  @IsNumber()
  tax_rate_id?: number;

  @IsOptional()
  @IsNumber()
  project_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internal_memo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  po_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  payment_terms?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shipping_amount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['none', 'percentage', 'fixed'])
  discount_type?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount_value?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];
}
