// DTO for creating a recurring invoice template with line items
import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, IsIn, ValidateNested, IsDateString, Min, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class RecurringInvoiceLineDto {
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

export class CreateRecurringInvoiceDto {
  @IsOptional()
  @IsNumber()
  contact_id?: number;

  @IsString()
  @MaxLength(255)
  customer_name!: string;

  @IsString()
  @MaxLength(255)
  template_name!: string;

  @IsString()
  @IsIn(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'])
  frequency!: string;

  @IsDateString()
  next_run_date!: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax_rate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  auto_send?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecurringInvoiceLineDto)
  lines!: RecurringInvoiceLineDto[];
}
