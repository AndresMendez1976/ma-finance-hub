// DTO for recording material consumption against a work order
import { IsNumber, IsArray, ValidateNested, IsDateString, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialLineDto {
  @IsNumber()
  product_id!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity_used!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unit_cost!: number;
}

export class RecordMaterialsDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MaterialLineDto)
  lines!: MaterialLineDto[];
}
