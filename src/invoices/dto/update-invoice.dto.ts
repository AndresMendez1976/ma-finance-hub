// DTO for updating an existing draft invoice
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceLineDto } from './create-invoice.dto';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customer_address?: string;

  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax_rate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];
}
