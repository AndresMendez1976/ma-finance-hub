// DTO for creating a job cost entry
import { IsString, IsOptional, IsNumber, IsDateString, Min, MaxLength, IsIn } from 'class-validator';

export class CreateJobCostEntryDto {
  @IsNumber()
  project_id!: number;

  @IsNumber()
  cost_code_id!: number;

  @IsDateString()
  date!: string;

  @IsString()
  @IsIn(['labor', 'material', 'equipment', 'subcontract', 'overhead', 'other'])
  source_type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_cost!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total_cost!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgeted_quantity?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgeted_cost?: number;

  @IsOptional()
  @IsNumber()
  source_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}
