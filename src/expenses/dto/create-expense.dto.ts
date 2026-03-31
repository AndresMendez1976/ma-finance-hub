// DTO for creating a new expense
import { IsString, IsOptional, IsNumber, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MaxLength(255)
  vendor_name!: string;

  @IsString()
  @MaxLength(100)
  category!: string;

  @IsNumber()
  account_id!: number;

  @IsOptional()
  @IsNumber()
  payment_account_id?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}
