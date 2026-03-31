// DTO for updating a budget
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsIn, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetLineDto } from './create-budget.dto';

export class UpdateBudgetDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(2000)
  fiscal_year?: number;

  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'quarterly', 'annual'])
  period_type?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'active', 'closed'])
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetLineDto)
  lines?: BudgetLineDto[];
}
