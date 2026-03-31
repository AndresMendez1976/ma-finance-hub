// DTO for recording labor against a work order
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class LaborLineDto {
  @IsOptional()
  @IsNumber()
  employee_id?: number;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  hours_worked!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourly_rate!: number;
}

export class RecordLaborDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LaborLineDto)
  lines!: LaborLineDto[];
}
