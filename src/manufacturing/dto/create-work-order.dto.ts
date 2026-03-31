// DTO for creating a work order
import { IsString, IsOptional, IsNumber, IsDateString, Min, MaxLength, IsIn } from 'class-validator';

export class CreateWorkOrderDto {
  @IsNumber()
  bom_id!: number;

  @IsNumber()
  product_id!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  quantity_to_produce!: number;

  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @IsOptional()
  @IsDateString()
  scheduled_start?: string;

  @IsOptional()
  @IsDateString()
  scheduled_end?: string;

  @IsOptional()
  @IsNumber()
  location_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  assigned_to?: string;
}
