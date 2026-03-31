// DTO for creating an inventory transfer between locations
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferLineDto {
  @IsNumber()
  product_id!: number;

  @IsOptional()
  @IsNumber()
  lot_id?: number;

  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;
}

export class CreateTransferDto {
  @IsNumber()
  from_location_id!: number;

  @IsNumber()
  to_location_id!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines!: TransferLineDto[];
}
