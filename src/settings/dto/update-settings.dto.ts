import { IsOptional, IsString, IsInt, IsEmail, MaxLength, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  company_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  company_phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_address_line1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_address_line2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company_city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company_state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  company_zip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company_country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscal_year_start_month?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  default_currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  invoice_prefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  invoice_next_number?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  expense_prefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expense_next_number?: number;
}
