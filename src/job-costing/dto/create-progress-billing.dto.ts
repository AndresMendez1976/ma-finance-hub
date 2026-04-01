// DTO for creating a progress billing
import { IsString, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ProgressBillingLineDto {
  @IsOptional()
  @IsNumber()
  cost_code_id?: number;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  retention_percent?: number;
}

export class CreateProgressBillingDto {
  @IsNumber()
  project_id!: number;

  @IsDateString()
  billing_date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgressBillingLineDto)
  lines!: ProgressBillingLineDto[];
}
