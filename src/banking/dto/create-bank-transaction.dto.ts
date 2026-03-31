// DTO for creating a bank transaction
import { IsString, IsOptional, IsNumber, IsDateString, IsIn, MaxLength } from 'class-validator';

export class CreateBankTransactionDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsString()
  @IsIn(['deposit', 'withdrawal', 'transfer', 'fee', 'interest'])
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
