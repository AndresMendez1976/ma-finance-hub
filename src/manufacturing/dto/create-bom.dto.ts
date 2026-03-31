// DTO for creating a Bill of Materials with component lines, labor, and overhead
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, Min, MaxLength, ArrayMinSize, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class BomLineDto {
  @IsNumber()
  component_product_id!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity_required!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit_of_measure?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  waste_percentage?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost_per_unit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class BomLaborDto {
  @IsString()
  @MaxLength(255)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  hours_required!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourly_rate!: number;
}

export class BomOverheadDto {
  @IsString()
  @MaxLength(255)
  description!: string;

  @IsIn(['fixed', 'per_unit'])
  cost_type!: 'fixed' | 'per_unit';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}

export class CreateBomDto {
  @IsNumber()
  product_id!: number;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  version?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  yield_quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomLineDto)
  lines!: BomLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomLaborDto)
  labor?: BomLaborDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomOverheadDto)
  overhead?: BomOverheadDto[];
}
