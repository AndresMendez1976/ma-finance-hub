// DTO for marking an invoice as paid
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class PayInvoiceDto {
  @IsDateString()
  paid_date!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  paid_amount!: number;

  @IsOptional()
  @IsNumber()
  fiscal_period_id?: number;

  @IsOptional()
  @IsNumber()
  cash_account_id?: number;
}
