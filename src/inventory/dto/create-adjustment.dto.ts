// DTO for creating an inventory adjustment
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustmentLineDto {
  @IsNumber()
  product_id!: number;

  @IsNumber()
  location_id!: number;

  @IsOptional()
  @IsNumber()
  lot_id?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  qty_on_hand!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  qty_counted!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_cost!: number;
}

export class CreateAdjustmentDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineDto)
  lines!: AdjustmentLineDto[];
}
