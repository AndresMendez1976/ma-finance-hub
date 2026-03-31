// DTO for creating a new contact (customer/vendor)
import { IsString, IsOptional, IsNumber, IsEmail, IsIn, MaxLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsIn(['customer', 'vendor', 'both'])
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string;

  @IsString()
  @MaxLength(100)
  first_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address_line1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address_line2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  default_revenue_account_id?: number;

  @IsOptional()
  @IsNumber()
  default_expense_account_id?: number;
}
