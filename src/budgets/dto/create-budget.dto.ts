// DTO for creating a budget with lines
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsIn, IsDateString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetLineDto {
  @IsNumber()
  account_id!: number;

  @IsDateString()
  period_start!: string;

  @IsDateString()
  period_end!: string;

  @IsNumber()
  budgeted_amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBudgetDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsNumber()
  @Min(2000)
  fiscal_year!: number;

  @IsString()
  @IsIn(['monthly', 'quarterly', 'annual'])
  period_type!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetLineDto)
  lines!: BudgetLineDto[];
}
