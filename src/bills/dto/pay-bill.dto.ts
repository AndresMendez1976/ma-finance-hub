// DTO for paying a vendor bill
import { IsDateString, IsNumber, IsOptional, IsString, IsIn, Min, MaxLength } from 'class-validator';

export class PayBillDto {
  @IsDateString()
  payment_date!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsIn(['cash', 'check', 'bank_transfer', 'credit_card'])
  payment_method!: string;

  @IsOptional()
  @IsNumber()
  bank_account_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;
}
