// DTO for disposing a fixed asset
import { IsDateString, IsNumber, Min } from 'class-validator';

export class DisposeAssetDto {
  @IsDateString()
  disposal_date!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  disposal_price!: number;
}
