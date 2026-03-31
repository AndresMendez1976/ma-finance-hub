// DTO for creating a new bank account
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsNumber()
  account_id!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  institution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  account_number_last4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'USD';
}
