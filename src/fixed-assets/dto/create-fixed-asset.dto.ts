// DTO for creating a new fixed asset
import { IsString, IsOptional, IsNumber, IsDateString, IsIn, IsInt, Min, MaxLength } from 'class-validator';

export class CreateFixedAssetDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(100)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serial_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsDateString()
  purchase_date!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchase_price!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salvage_value?: number;

  @IsInt()
  @Min(1)
  useful_life_months!: number;

  @IsString()
  @IsIn(['straight_line', 'declining_balance'])
  depreciation_method!: string;

  @IsNumber()
  asset_account_id!: number;

  @IsNumber()
  depreciation_expense_account_id!: number;

  @IsNumber()
  accumulated_depreciation_account_id!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
