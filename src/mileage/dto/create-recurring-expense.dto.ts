// DTO for creating a recurring expense
import { IsString, IsOptional, IsNumber, IsDateString, IsIn, MaxLength, Min } from 'class-validator';

export class CreateRecurringExpenseDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber()
  account_id!: number;

  @IsOptional()
  @IsNumber()
  payment_account_id?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsIn(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'])
  frequency!: string;

  @IsDateString()
  start_date!: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
