// DTO for updating an existing payroll employee — all fields optional
import { IsString, IsOptional, IsNumber, IsDateString, IsEmail, IsIn, Min, MaxLength } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  ssn_last4?: string;

  @IsOptional()
  @IsDateString()
  hire_date?: string;

  @IsOptional()
  @IsIn(['salary', 'hourly'])
  pay_type?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pay_rate?: number;

  @IsOptional()
  @IsIn(['weekly', 'biweekly', 'semimonthly', 'monthly'])
  pay_frequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @IsOptional()
  @IsIn(['single', 'married', 'head_of_household'])
  federal_filing_status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  federal_allowances?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  state_filing_status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  state_allowances?: number;

  @IsOptional()
  @IsNumber()
  contact_id?: number;

  @IsOptional()
  @IsIn(['active', 'inactive', 'terminated'])
  status?: string;

  @IsOptional()
  @IsDateString()
  termination_date?: string;
}
