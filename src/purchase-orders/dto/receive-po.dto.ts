// DTO for receiving goods against a purchase order
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiptLineDto {
  @IsNumber()
  po_line_id!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity_received!: number;
}

export class ReceivePoDto {
  @IsDateString()
  receipt_date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineDto)
  lines!: ReceiptLineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  fiscal_period_id?: number;
}
