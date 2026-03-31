// DTO for updating an existing product — all fields optional
import { IsString, IsOptional, IsNumber, IsBoolean, IsIn, MaxLength, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @IsIn(['inventory', 'non_inventory', 'service'])
  type?: string;

  @IsOptional()
  @IsString()
  @IsIn(['fifo', 'lifo', 'average_cost'])
  costing_method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit_of_measure?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sale_price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchase_price?: number;

  @IsOptional()
  @IsNumber()
  revenue_account_id?: number;

  @IsOptional()
  @IsNumber()
  cogs_account_id?: number;

  @IsOptional()
  @IsNumber()
  inventory_account_id?: number;

  @IsOptional()
  @IsNumber()
  expense_account_id?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  reorder_point?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  reorder_quantity?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  track_lots?: boolean;

  @IsOptional()
  @IsBoolean()
  track_serials?: boolean;
}
