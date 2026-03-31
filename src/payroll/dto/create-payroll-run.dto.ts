// DTO for creating a new payroll run
import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreatePayrollRunDto {
  @IsDateString()
  pay_period_start!: string;

  @IsDateString()
  pay_period_end!: string;

  @IsDateString()
  pay_date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
