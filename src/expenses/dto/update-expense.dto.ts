// DTO for updating a pending expense
import { IsString, IsOptional, IsNumber, IsDateString, Min, MaxLength } from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsNumber()
  account_id?: number;

  @IsOptional()
  @IsNumber()
  payment_account_id?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}
